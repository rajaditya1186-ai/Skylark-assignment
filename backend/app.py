"""
FastAPI application entry point.
Implements HTTP endpoints, CORS rules, in-memory caches, and error handlers.
Ensures zero traceback leaks to the client.
"""
import uuid
import time
import logging
from typing import Tuple, Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from config import settings
from models import ChatRequest, ChatResponse, LeadershipSummaryResponse, ErrorResponse
from monday_client import MondayClient, MondayAPIError
from data_cleaner import clean_dataframe
from analytics import leadership_summary
from llm import classify_intent, generate_response, generate_leadership_narrative, OpenAIAPIError

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Business Intelligence Agent API",
    description="Backend API powering the commercial and operational dashboard for Skylark Drones.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory State & Caches ---

class MondayDataCache:
    """Simple time-to-live cache wrapper for raw Monday.com boards data."""
    def __init__(self, ttl_seconds: int):
        self.ttl = ttl_seconds
        self.cached_data: Optional[Dict[str, List[Dict[str, Any]]]] = None
        self.last_fetch_time: float = 0.0

    def get(self) -> Optional[Dict[str, List[Dict[str, Any]]]]:
        now = time.time()
        if self.cached_data and (now - self.last_fetch_time < self.ttl):
            return self.cached_data
        return None

    def set(self, data: Dict[str, List[Dict[str, Any]]]):
        self.cached_data = data
        self.last_fetch_time = time.time()

    def invalidate(self):
        self.cached_data = None
        self.last_fetch_time = 0.0

class ConversationHistoryCache:
    """Manages simple conversational logs per session."""
    def __init__(self, max_turns: int = 10):
        self.max_turns = max_turns
        # Maps conversation_id -> List[{"role": str, "content": str}]
        self.histories: Dict[str, List[Dict[str, str]]] = {}

    def get(self, conversation_id: str) -> List[Dict[str, str]]:
        return self.histories.setdefault(conversation_id, [])

    def add_turn(self, conversation_id: str, role: str, content: str):
        history = self.get(conversation_id)
        history.append({"role": role, "content": content})
        # Bound size: max_turns * 2 (user + assistant turns)
        if len(history) > self.max_turns * 2:
            self.histories[conversation_id] = history[-(self.max_turns * 2):]

monday_client = MondayClient()
data_cache = MondayDataCache(ttl_seconds=settings.cache_ttl_seconds)
history_cache = ConversationHistoryCache(max_turns=10)

# --- Data Fetching and Cleaning Pipeline ---

async def get_raw_data(refresh: bool = False) -> Dict[str, Any]:
    """Fetches raw Monday.com data with caching support."""
    data = None
    if not refresh:
        data = data_cache.get()

    if not data:
        logger.info("Cache miss or manual refresh triggered. Fetching fresh data from Monday.com...")
        data = await monday_client.get_all_data()
        data_cache.set(data)
    return data

async def get_and_clean_deals(refresh: bool = False) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Fetches and cleans only the Deals board data."""
    data = await get_raw_data(refresh)
    raw_deals = data.get("deals", [])
    deals_df, deals_meta = clean_dataframe(
        raw_deals,
        expected_columns={
            "Sector": "sector",
            "Sector/service": "sector",
            "Sector/Service": "sector",
            "service": "sector",
            "Stage": "stage",
            "Deal Stage": "stage",
            "Value": "value",
            "Deal Value": "value",
            "Masked Deal value": "value",
            "Masked Deal Value": "value",
            "Probability": "probability",
            "Expected Close Date": "expected_close_date",
            "Owner": "owner",
            "Owner code": "owner",
            "Owner Code": "owner"
        },
        numeric_cols=["value", "probability"],
        date_cols=["expected_close_date"],
        text_cols=["sector", "stage", "owner"]
    )
    return deals_df, deals_meta

async def get_and_clean_work_orders(refresh: bool = False) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Fetches and cleans only the Work Orders board data."""
    data = await get_raw_data(refresh)
    raw_work_orders = data.get("work_orders", [])
    work_orders_df, work_orders_meta = clean_dataframe(
        raw_work_orders,
        expected_columns={
            "Status": "status",
            "Work Order Date": "start_date",
            "Due Date": "due_date",
            "Sector": "sector",
            "Sector/service": "sector",
            "Sector/Service": "sector",
            "Assignee": "assigned_to",
            "Assigned To": "assigned_to"
        },
        numeric_cols=[],
        date_cols=["start_date", "due_date"],
        text_cols=["status", "sector", "assigned_to"]
    )
    return work_orders_df, work_orders_meta

async def get_and_clean_data(refresh: bool = False) -> Tuple[pd.DataFrame, Dict[str, Any], pd.DataFrame, Dict[str, Any]]:
    """
    Fetches raw boards data (cached) and cleans both datasets.
    """
    deals_df, deals_meta = await get_and_clean_deals(refresh)
    work_orders_df, work_orders_meta = await get_and_clean_work_orders(refresh)
    return deals_df, deals_meta, work_orders_df, work_orders_meta

# --- Routes ---

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, str]:
    """Uptime health check endpoint."""
    return {"status": "ok", "mode": "mock" if settings.is_monday_mock_mode else "live"}

@app.get("/boards")
async def get_boards(refresh: bool = Query(False, description="Bypass in-memory cache")) -> Dict[str, Any]:
    """
    Diagnostic endpoint.
    Returns cleaned items and parsing metadata for both Deals and Work Orders boards.
    """
    try:
        deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data(refresh)
        return {
            "deals": deals_df.to_dict(orient="records"),
            "work_orders": work_orders_df.to_dict(orient="records"),
            "metadata": {
                "deals": deals_meta,
                "work_orders": work_orders_meta
            }
        }
    except MondayAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch data from Monday.com: {e.message}"
        )
    except Exception as e:
        logger.exception("Unexpected error in /boards")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while fetching boards."
        )

@app.post("/chat", response_model=ChatResponse, responses={
    502: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
})
async def chat(request: ChatRequest):
    """
    Accepts user messages, routes them by intent, performs targeted analytics,
    and returns conversational responses. Handles clarifications on ambiguity.
    """
    conversation_id = request.conversation_id or str(uuid.uuid4())
    message = request.message.strip()

    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty.")

    try:
        # 1. Check intent and ambiguity
        history = history_cache.get(conversation_id)
        is_ambiguous, clarifying_question, route = await classify_intent(message, history)

        if is_ambiguous:
            logger.info(f"Query ambiguous. Returning clarification prompt for route: {route}.")
            # Log turn into history
            history_cache.add_turn(conversation_id, "user", message)
            history_cache.add_turn(conversation_id, "assistant", clarifying_question or "")
            return ChatResponse(
                answer=clarifying_question or "Could you clarify your request?",
                conversation_id=conversation_id,
                data_complete=True,
                structured_summary=None,
                missing_data_notes=None
            )

        # 2. Pipeline processing: Fetch & clean & compute strictly for the intent
        print(f"[INTENT CLASSIFIER] User Query: '{message}' | Classified Intent Route: {route}")
        logger.info(f"Classified user query to route: {route}")

        from analytics import (
            pipeline_summary_analytics,
            open_opportunities_analytics,
            top_deals_analytics,
            delayed_work_orders_analytics,
            work_order_summary_analytics,
            revenue_forecast_analytics,
            leadership_summary_analytics,
            pipeline_vs_work_orders_analytics,
            data_quality_analytics,
            owner_analysis_analytics,
            stage_breakdown_analytics,
            general_business_health_analytics,
            charts_pipeline_stage,
            charts_revenue_forecast,
            charts_work_orders,
            charts_top_deals
        )

        data_complete = True
        missing_data_notes = []

        if route == "pipeline_summary":
            deals_df, deals_meta = await get_and_clean_deals()
            summary = pipeline_summary_analytics(deals_df)
            data_complete = int(deals_meta.get("missing_fields", {}).get("value", 0)) == 0
            # Always pass relevant charts for inline chat rendering
            summary["charts"] = {
                "pipeline_stage": charts_pipeline_stage(deals_df),
                "revenue_forecast": charts_revenue_forecast(deals_df, "2026-07-27")
            }
        elif route == "open_opportunities":
            deals_df, deals_meta = await get_and_clean_deals()
            summary = open_opportunities_analytics(deals_df)
            summary["charts"] = {
                "pipeline_stage": charts_pipeline_stage(deals_df),
                "opportunity_distribution": [
                    {"name": "Open", "value": len(deals_df[~deals_df["stage"].isin(["Won", "Lost"])])},
                    {"name": "Won", "value": int(deals_df["stage"].value_counts().get("Won", 0))},
                    {"name": "Lost", "value": int(deals_df["stage"].value_counts().get("Lost", 0))}
                ]
            }
        elif route == "top_deals":
            deals_df, deals_meta = await get_and_clean_deals()
            summary = top_deals_analytics(deals_df)
            summary["charts"] = {
                "top_deals": charts_top_deals(deals_df)
            }
        elif route == "delayed_work_orders":
            work_orders_df, work_orders_meta = await get_and_clean_work_orders()
            summary = delayed_work_orders_analytics(work_orders_df)
            summary["charts"] = {
                "work_orders": charts_work_orders(work_orders_df)
            }
            # Add delayed items list inside delayed_work_orders dict key for layout table in chat turning
            summary["delayed_work_orders"] = {
                "delayed_items": summary["delayed_items"]
            }
        elif route == "work_order_summary":
            work_orders_df, work_orders_meta = await get_and_clean_work_orders()
            summary = work_order_summary_analytics(work_orders_df)
            summary["charts"] = {
                "work_orders": charts_work_orders(work_orders_df)
            }
        elif route == "revenue_forecast":
            deals_df, deals_meta = await get_and_clean_deals()
            summary = revenue_forecast_analytics(deals_df)
            summary["charts"] = {
                "revenue_forecast": charts_revenue_forecast(deals_df, "2026-07-27")
            }
        elif route == "pipeline_vs_work_orders":
            deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
            summary = pipeline_vs_work_orders_analytics(deals_df, work_orders_df)
            summary["charts"] = {
                "pipeline_stage": charts_pipeline_stage(deals_df),
                "work_orders": charts_work_orders(work_orders_df)
            }
        elif route == "data_quality":
            deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
            summary = data_quality_analytics(deals_df, deals_meta, work_orders_df, work_orders_meta)
        elif route == "owner_analysis":
            deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
            summary = owner_analysis_analytics(deals_df, work_orders_df)
        elif route == "stage_breakdown":
            deals_df, deals_meta = await get_and_clean_deals()
            summary = stage_breakdown_analytics(deals_df)
            summary["charts"] = {
                "pipeline_stage": charts_pipeline_stage(deals_df)
            }
        elif route == "leadership_summary":
            deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
            summary = leadership_summary_analytics(deals_df, deals_meta, work_orders_df, work_orders_meta)
            data_complete = summary["data_completeness"]["is_complete"]
            missing_data_notes = summary["data_completeness"]["missing_data_notes"]
        else: # general_business_health
            deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
            summary = general_business_health_analytics(deals_df, work_orders_df)

        # 4. Narration via LLM
        try:
            answer = await generate_response(message, route, summary, history)
        except OpenAIAPIError as e:
            logger.warning(f"OpenAI error in /chat: {e}. Falling back to structured data dump.")
            # Graceful degradation fallback
            fallback_ans = "AI Narration is temporarily unavailable. Please refer directly to the structured analytics details below."
            return ChatResponse(
                answer=fallback_ans,
                conversation_id=conversation_id,
                data_complete=data_complete,
                structured_summary=summary,
                missing_data_notes=missing_data_notes
            )

        # 5. Save conversational state
        history_cache.add_turn(conversation_id, "user", message)
        history_cache.add_turn(conversation_id, "assistant", answer)

        return ChatResponse(
            answer=answer,
            conversation_id=conversation_id,
            data_complete=data_complete,
            structured_summary=summary,
            missing_data_notes=missing_data_notes
        )

    except MondayAPIError as e:
        logger.error(f"MondayAPIError in /chat: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Couldn't reach Monday.com — please check the board connection. ({e.message})"
        )
    except Exception as e:
        logger.exception("Unexpected exception in /chat")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred while processing your request."
        )

@app.post("/leadership-summary", response_model=LeadershipSummaryResponse, responses={
    502: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
})
async def get_leadership_summary():
    """
    Generates a structured weekly executive narrative update.
    Skipped classification to directly produce leadership summaries.
    """
    try:
        deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data()
        summary = leadership_summary(deals_df, deals_meta, work_orders_df, work_orders_meta, current_date="2026-07-27")

        try:
            narrative = await generate_leadership_narrative(summary)
        except OpenAIAPIError as e:
            logger.warning(f"OpenAI error in /leadership-summary: {e}. Falling back.")
            fallback_narrative = (
                "# Leadership Update\n\n"
                "AI Narration is temporarily unavailable. Please refer directly to the structured summary details below."
            )
            return LeadershipSummaryResponse(
                narrative=fallback_narrative,
                data_complete=summary["data_completeness"]["is_complete"],
                structured_summary=summary,
                missing_data_notes=summary["data_completeness"]["missing_data_notes"]
            )

        return LeadershipSummaryResponse(
            narrative=narrative,
            data_complete=summary["data_completeness"]["is_complete"],
            structured_summary=summary,
            missing_data_notes=summary["data_completeness"]["missing_data_notes"]
        )

    except MondayAPIError as e:
        logger.error(f"MondayAPIError in /leadership-summary: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Couldn't reach Monday.com — please check the board connection. ({e.message})"
        )
    except Exception as e:
        logger.exception("Unexpected exception in /leadership-summary")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected internal server error occurred while generating the leadership summary."
        )

# --- Dashboard BI Analytics Endpoints ---

@app.get("/dashboard")
async def get_dashboard(refresh: bool = Query(False, description="Bypass cache and force refresh Monday.com data")):
    """
    Returns unified dashboard dataset including KPIs, Recharts data, AI insights, and data quality logs.
    """
    try:
        deals_df, deals_meta, work_orders_df, work_orders_meta = await get_and_clean_data(refresh)
        from analytics import dashboard_analytics
        return dashboard_analytics(deals_df, deals_meta, work_orders_df, work_orders_meta, current_date="2026-07-27")
    except MondayAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Couldn't reach Monday.com: {e.message}"
        )
    except Exception as e:
        logger.exception("Unexpected error in /dashboard endpoint")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard metrics."
        )

@app.get("/charts/pipeline-stage")
async def get_pipeline_stage(refresh: bool = Query(False)):
    """Pipeline Stage horizontal chart data."""
    try:
        deals_df, _, _, _ = await get_and_clean_data(refresh)
        from analytics import charts_pipeline_stage
        return charts_pipeline_stage(deals_df)
    except Exception as e:
        logger.exception("Error in /charts/pipeline-stage")
        raise HTTPException(status_code=500, detail="Failed to load pipeline stage data.")

@app.get("/charts/revenue-forecast")
async def get_revenue_forecast(refresh: bool = Query(False)):
    """6-month revenue forecast chart data."""
    try:
        deals_df, _, _, _ = await get_and_clean_data(refresh)
        from analytics import charts_revenue_forecast
        return charts_revenue_forecast(deals_df, current_date="2026-07-27")
    except Exception as e:
        logger.exception("Error in /charts/revenue-forecast")
        raise HTTPException(status_code=500, detail="Failed to load revenue forecast data.")

@app.get("/charts/work-orders")
async def get_work_orders_chart(refresh: bool = Query(False)):
    """Work orders status count chart data."""
    try:
        _, _, work_orders_df, _ = await get_and_clean_data(refresh)
        from analytics import charts_work_orders
        return charts_work_orders(work_orders_df)
    except Exception as e:
        logger.exception("Error in /charts/work-orders")
        raise HTTPException(status_code=500, detail="Failed to load work orders status.")

@app.get("/charts/top-deals")
async def get_top_deals(refresh: bool = Query(False)):
    """Top 10 active deal value horizontal chart data."""
    try:
        deals_df, _, _, _ = await get_and_clean_data(refresh)
        from analytics import charts_top_deals
        return charts_top_deals(deals_df)
    except Exception as e:
        logger.exception("Error in /charts/top-deals")
        raise HTTPException(status_code=500, detail="Failed to load top deals.")

@app.get("/charts/closure-probability")
async def get_probability_chart(refresh: bool = Query(False)):
    """Closure probability distribution bucket chart data."""
    try:
        deals_df, _, _, _ = await get_and_clean_data(refresh)
        from analytics import charts_closure_probability
        return charts_closure_probability(deals_df)
    except Exception as e:
        logger.exception("Error in /charts/closure-probability")
        raise HTTPException(status_code=500, detail="Failed to load probability distribution.")
