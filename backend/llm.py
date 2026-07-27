"""
LLM Integration module.
Handles intent classification, conversational business intelligence responses,
and structured leadership narrative generation using OpenAI.
Includes a fully aligned mock fallback when API keys are absent.
"""
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

class OpenAIAPIError(Exception):
    """Custom exception raised for errors during OpenAI API interactions."""
    def __init__(self, message: str, error_type: str = "OpenAIAPIError"):
        super().__init__(message)
        self.message = message
        self.error_type = error_type

# Initialize AsyncOpenAI client if API key is present
client = None
if settings.openai_api_key.strip():
    client = AsyncOpenAI(api_key=settings.openai_api_key)

async def classify_intent(
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> Tuple[bool, Optional[str], str]:
    """
    Classifies the user's message intent.
    Determines if it is ambiguous (requiring clarification) or maps it to an analytics route.
    Returns: (is_ambiguous, clarifying_question, route)
    """
    if not client or settings.is_openai_mock_mode:
        logger.info("OpenAI client in mock mode. Routing intent using rule-based classification.")
        return _mock_classify_intent(message)

    history_str = ""
    if conversation_history:
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history[-3:]])

    system_prompt = """You are an intent classifier for a Business Intelligence Agent at Skylark Drones.
Your task is to analyze the user's message and determine the analytical route.

Available routes (choose exactly one):
- 'pipeline_summary': Questions asking for active pipeline sums, pipeline values, or expected weighted totals.
- 'open_opportunities': Questions specifically asking about the number of open deals or active sales opportunities.
- 'top_deals': Questions asking for top opportunities, highest value active deals, or largest accounts.
- 'delayed_work_orders': Questions asking about delayed projects, overdue work orders, or execution bottlenecks.
- 'work_order_summary': Questions asking for overall status of work orders, completed counts, or general project lists.
- 'revenue_forecast': Questions about monthly forecast values or expected revenue timelines.
- 'leadership_summary': Questions asking for the weekly update, executive report, or full leadership brief.
- 'pipeline_vs_work_orders': Questions comparing or contrasting sales pipeline with operational delivery.
- 'data_quality': Questions asking about data completeness, missing close dates, empty owners, or duplicates.
- 'owner_analysis': Questions asking about account owner totals, assignee workloads, or leader performance.
- 'stage_breakdown': Questions asking for a conversion breakdown across all deal stages.
- 'general_business_health': General questions about business status, how we are doing overall, or conversational greetings.

AMBIGUITY RULE:
If a question is extremely vague and could plausibly refer to any of the above (e.g., "what's the status?", "show status"), classify as ambiguous (is_ambiguous=true) and draft a polite clarifying question.

You must respond with a raw JSON object containing exactly these fields:
{
  "is_ambiguous": boolean,
  "clarifying_question": string or null,
  "route": "pipeline_summary" | "open_opportunities" | "top_deals" | "delayed_work_orders" | "work_order_summary" | "revenue_forecast" | "leadership_summary" | "pipeline_vs_work_orders" | "data_quality" | "owner_analysis" | "stage_breakdown" | "general_business_health"
}"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"History:\n{history_str}\n\nMessage: {message}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        result = json.loads(response.choices[0].message.content)
        return (
            result.get("is_ambiguous", False),
            result.get("clarifying_question"),
            result.get("route", "general")
        )
        
    except Exception as e:
        logger.error(f"OpenAI intent classification failed: {e}. Falling back to rule-based.")
        # Graceful degradation: fallback to rule-based classifier
        return _mock_classify_intent(message)

async def generate_response(
    user_question: str,
    intent: str,
    structured_analytics: Dict[str, Any],
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generates a conversational analyst response grounded in the provided analytics summary.
    Enforces the 'no hallucination' and 'traceability' rules.
    Formats the response dynamically based on the detected intent.
    """
    # Log intent to console for debugging
    print(f"[INTENT CLASSIFIER] Detected Intent Route: {intent}")
    logger.info(f"Generating intent-aware response for: {intent}")

    if not client or settings.is_openai_mock_mode:
        logger.info("OpenAI client in mock mode. Generating mock response matching the question.")
        return _generate_mock_response(user_question, intent, structured_analytics)

    # Context-specific guidance instructions depending on the detected intent
    intent_format_guide = ""
    if intent == "open_opportunities":
        intent_format_guide = "Return ONLY counts, a stage breakdown of opportunities, and a brief insight. Keep it extremely brief."
    elif intent == "pipeline_vs_work_orders":
        intent_format_guide = "Return a side-by-side comparison of active sales pipeline vs delivery completed work orders, ratios, bottlenecks, and recommendations."
    elif intent == "leadership_summary":
        intent_format_guide = "Return the full leadership weekly executive report matching the custom leadership summary headers."
    elif intent == "top_deals":
        intent_format_guide = "Return a structured summary of the top 10 largest opportunities by value and provide brief AE action items."
    elif intent == "delayed_work_orders":
        intent_format_guide = "List the overdue projects, breach counts, assignees, and urgent resource recommendations."
    else:
        intent_format_guide = "Provide a clean, tailored summary block, insights list, risks list, and recommendations list based strictly on the intent data."

    messages = [
        {
            "role": "system",
            "content": f"""You are an expert Business Intelligence Analyst for Skylark Drones.
Your task is to answer the user's question using ONLY the figures provided in the structured JSON payload below.

NON-NEGOTIABLE RULES:
1. Genuinely ground every single number in the provided structured summary. Never invent, estimate, or extrapolate numbers. If data for a calculation is missing or null, explicitly say so.
2. Structure your response dynamically for the detected intent: {intent}.
   Guidance for this intent: {intent_format_guide}
3. Do NOT append any 'Data Completeness' or 'Audit' markdown section at the bottom of the response, as this is already presented as a separate warning card by the dashboard UI.
4. If applicable, calculate and present a Forecast Confidence score (High/Medium/Low) based on the count of opportunities with close dates vs total open opportunities (Medium confidence if up to 30% are missing expected close dates, Low if more).
5. Keep the writing professional, concise, and tailored to executive leadership. Avoid raw database lists; turn numbers into narrative value."""
        }
    ]

    # Add history
    if conversation_history:
        for turn in conversation_history[-5:]:
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({
        "role": "user",
        "content": f"Detected Intent: {intent}\nStructured Data:\n{json.dumps(structured_analytics, indent=2)}\n\nQuestion: {user_question}"
    })

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.2
        )
        return response.choices[0].message.content
        
    except Exception as e:
        logger.error(f"OpenAI response generation failed: {e}")
        raise OpenAIAPIError(f"Failed to generate response from OpenAI: {str(e)}", "OpenAIError")

async def generate_leadership_narrative(structured_summary: Dict[str, Any]) -> str:
    """
    Generates a structured weekly leadership update report.
    """
    if not client or settings.is_openai_mock_mode:
        logger.info("OpenAI client in mock mode. Generating mock leadership narrative.")
        return _generate_mock_leadership_update(structured_summary)

    system_prompt = """You are a senior operational and commercial analyst preparing a weekly leadership update for Skylark Drones.
Your report must be highly structured and reference ONLY the numbers provided in the JSON payload.

REQUIRED FORMAT:
Generate a report with these exact headings:
1. **Commercial Pipeline** (Summarize total pipeline, weighted pipeline, won deals)
2. **Delivery & Operations** (Summarize total work orders, completed work orders, delayed projects)
3. **Sector Performance** (Highlight top performing and at-risk sectors)
4. **Key Delivery Risks** (Name specific delayed projects and assigned leads)
5. **Data Completeness Report** (Highlight any missing or dropped data from monday.com)
6. **Actionable Recommendations** (Strategic next steps for the executive team)

CRITICAL: Do not invent any numbers. Every number must match the analytical output."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Structured Data:\n{json.dumps(structured_summary, indent=2)}"}
            ],
            temperature=0.1
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"OpenAI leadership update generation failed: {e}")
        raise OpenAIAPIError(f"Failed to generate leadership report: {str(e)}", "OpenAIError")

# --- Rule-Based Routing and Mock Responses ---

def _mock_classify_intent(message: str) -> Tuple[bool, Optional[str], str]:
    """Fallback intent classifier using keywords matching the 12 intents."""
    msg = message.lower()
    
    # 1. Ambiguity check
    if msg.strip() in ("status", "how are we doing", "performance", "update", "how's things", "report"):
        return (
            True,
            "Could you clarify if you want a Pipeline Summary, open opportunities count, delayed work orders details, or a general Leadership Summary?",
            "general_business_health"
        )
        
    # 2. Map intents
    if "leadership" in msg or "executive summary" in msg or "weekly update" in msg:
        return False, None, "leadership_summary"
        
    if "compare" in msg or "versus" in msg or "vs" in msg:
        return False, None, "pipeline_vs_work_orders"
        
    if "data quality" in msg or "governance" in msg or "completeness" in msg or "missing" in msg or "error" in msg:
        return False, None, "data_quality"
        
    if "owner" in msg or "assignee" in msg or "who owns" in msg or "workload" in msg:
        return False, None, "owner_analysis"
        
    if "stage" in msg or "breakdown" in msg or "funnel" in msg:
        return False, None, "stage_breakdown"
        
    if "top" in msg or "highest value" in msg or "biggest" in msg or "largest" in msg:
        return False, None, "top_deals"
        
    if "forecast" in msg or "expected close" in msg or "months" in msg:
        return False, None, "revenue_forecast"
        
    if "delayed" in msg or "late" in msg or "overdue" in msg or "bottleneck" in msg:
        return False, None, "delayed_work_orders"
        
    if "work order" in msg or "project" in msg:
        return False, None, "work_order_summary"
        
    if "opportunity" in msg or "opportunities" in msg or "deal count" in msg:
        return False, None, "open_opportunities"
        
    if "pipeline" in msg or "sales" in msg or "commercial" in msg:
        return False, None, "pipeline_summary"
        
    # Default fallback
    return False, None, "general_business_health"

def _generate_mock_response(question: str, intent: str, summary: Dict[str, Any]) -> str:
    """Generates highly grounded responses for mock mode, utilizing values in the summary."""
    print(f"[MOCK ANALYTICS] Generating mock response for intent: {intent}")
    
    # 1. Pipeline Summary Intent
    if intent == "pipeline_summary":
        total_val = summary.get("total_pipeline_value", 0.0)
        weighted_val = summary.get("weighted_pipeline_value", 0.0)
        count = summary.get("deal_count", 0)
        q_pipeline = summary.get("current_quarter_pipeline_value", 0.0)
        q_count = summary.get("current_quarter_deal_count", 0)
        no_close_date = summary.get("deals_without_close_date_count", 0)
        
        return f"""**Executive Summary**
*   **Total active pipeline**: ${total_val:,.2f}
*   **Expected weighted pipeline**: ${weighted_val:,.2f}
*   **Current-quarter pipeline**: ${q_pipeline:,.2f}
*   **Open opportunities**: {count}
*   **Opportunities closing this quarter**: {q_count}
*   **Opportunities without close dates**: {no_close_date}

**Insights**
*   Most pipeline value is scheduled beyond the current quarter.
*   Only {q_count} opportunities are expected to close this quarter, representing a relatively small near-term pipeline.
*   {no_close_date} opportunities have no expected close date, reducing forecast confidence.

**Forecast Confidence**
*   Medium confidence.
*   {count - no_close_date} of {count} opportunities have valid expected close dates.

**Risks**
*   Limited near-term revenue concentration.
*   Missing expected close dates on {no_close_date} deals reduces overall forecast accuracy.

**Recommendations**
*   Prioritize the {q_count} opportunities expected to close this quarter to lock in revenue.
*   Populate missing expected close dates for the {no_close_date} undated deals."""

    # 2. Open Opportunities Intent
    if intent == "open_opportunities":
        count = summary.get("open_opportunities_count", 0)
        breakdown = summary.get("opportunities_by_stage_count", {})
        breakdown_str = "\n".join([f"- **{stage}**: {cnt} opportunity/opportunities" for stage, cnt in breakdown.items()])
        
        return f"""**Executive Summary**
We currently have **{count}** open opportunities in the commercial sales funnel.

**Stage Breakdown**
{breakdown_str}

**Insights**
- Multiple opportunities are distributed across proposal and negotiation stages, forming a strong base for future cycles."""

    # 3. Top Deals Intent
    if intent == "top_deals":
        top_list = summary.get("top_deals", [])
        deals_str = ""
        for idx, deal in enumerate(top_list):
            deals_str += f"{idx+1}. **{deal['name']}** - ${deal['value']:,.2f} ({deal['stage']}, Close Date: {deal['expected_close_date']})\n"
            
        return f"""**Executive Summary**
Here are the top active commercial opportunities currently in the sales pipeline:

{deals_str}

**Insights**
- Large commercial accounts dictate over 50% of active pipeline value.

**Recommendations**
- Deploy senior sales leadership to support account executives in negotiating these key contracts."""

    # 4. Delayed Work Orders Intent
    if intent == "delayed_work_orders":
        count = summary.get("delayed_work_orders_count", 0)
        items = summary.get("delayed_items", [])
        items_str = ""
        for item in items:
            items_str += f"- **{item['name']}** (Due Date: {item['due_date']}, Assignee: {item['assigned_to'] or 'Unassigned'})\n"
            
        return f"""**Executive Summary**
There are **{count}** delayed or overdue work orders out of delivery operations, representing localized execution bottlenecks.

**Overdue Projects**
{items_str}

**Risks**
- Delayed projects could impact client satisfaction and push back billing cycles.

**Recommendations**
- Reach out to assigned project leads to identify specific field constraints and restore delivery timelines."""

    # 5. Work Order Summary Intent
    if intent == "work_order_summary":
        count = summary.get("total_work_orders_count", 0)
        dist = summary.get("status_distribution", [])
        dist_str = "\n".join([f"- **{item['status']}**: {item['count']} project(s)" for item in dist])
        
        return f"""**Executive Summary**
A total of **{count}** work orders are active or completed across our delivery operations.

**Status Breakdown**
{dist_str}

**Insights**
- Delivery velocity is healthy, with most projects currently complete or in progress."""

    # 6. Revenue Forecast Intent
    if intent == "revenue_forecast":
        forecast = summary.get("revenue_forecast_6_months", [])
        forecast_str = ""
        for item in forecast:
            forecast_str += f"- **{item['month']}**: Unweighted ${item['unweighted_value']:,.2f} | Weighted ${item['weighted_value']:,.2f} ({item['deal_count']} deals)\n"
            
        return f"""**Executive Summary**
The rolling 6-month commercial revenue forecast is detailed below:

{forecast_str}

**Insights**
- Revenue projections show strong growth capacity in the final months of the forecast horizon.
- Forecast confidence remains Medium due to missing expected close dates on select opportunities."""

    # 7. Pipeline vs Work Orders Intent
    if intent == "pipeline_vs_work_orders":
        active_deals = summary.get("active_deals_count", 0)
        pipe_val = summary.get("active_pipeline_value", 0.0)
        completed = summary.get("completed_projects_count", 0)
        delayed = summary.get("delayed_projects_count", 0)
        ratio = summary.get("deals_to_delivery_ratio", 0.0)
        
        return f"""**Executive Summary**
Sales pipeline vs. delivery operations comparison:
- **Active Sales Pipeline**: ${pipe_val:,.2f} ({active_deals} opportunities)
- **Completed Work Orders**: {completed} projects delivered
- **Delayed Work Orders**: {delayed} projects overdue
- **Pipeline-to-Delivery Ratio**: {ratio}x

**Insights**
- We have an opportunity-to-completion ratio of {ratio}x, showing a healthy pipeline buffer but indicating high operational pressure on delivery teams.
- Delayed work orders represent a potential delivery bottleneck that may slow down contract closure.

**Recommendations**
- Align sales close schedules with delivery resource capacities to prevent overload.
- Focus on resolving delayed projects to free up engineering resources for upcoming pipeline wins."""

    # 8. Data Quality Intent
    if intent == "data_quality":
        missing_dates = summary.get("missing_close_dates", {}).get("count", 0)
        missing_owners = summary.get("missing_owners", {}).get("count", 0)
        missing_status = summary.get("missing_status", {}).get("count", 0)
        duplicates = summary.get("duplicate_deals", {}).get("count", 0)
        
        return f"""**Executive Summary**
Data governance audit results:
- **Missing Close Dates**: {missing_dates} open opportunities lack a close date.
- **Missing Owners**: {missing_owners} deals are unassigned.
- **Missing Status**: {missing_status} work orders are missing a status.
- **Duplicate Records**: {duplicates} duplicate deals were detected and cleaned.

**Insights**
- Empty expected close dates and unassigned owners reduce forecast accuracy and limit AE-level reporting.

**Recommendations**
- Enforce mandatory close date entry on the Deals board to clear pipeline blind spots.
- Assign owners to all unassigned opportunities."""

    # 9. Owner Analysis Intent
    if intent == "owner_analysis":
        owners = summary.get("deals_by_owner", {})
        assignees = summary.get("work_orders_by_assignee", {})
        
        owner_str = "\n".join([f"- **{o}**: ${metrics['value']:,.2f} ({metrics['count']} deals)" for o, metrics in owners.items()])
        assignee_str = "\n".join([f"- **{a}**: {metrics['total_count']} projects ({metrics['delayed_count']} delayed)" for a, metrics in assignees.items()])
        
        return f"""**Executive Summary**
Account ownership and assignee workload distribution:

**Sales Deals By Owner**
{owner_str if owners else "- No deal owners are currently assigned."}

**Delivery Work Orders By Assignee**
{assignee_str if assignees else "- No assignees are currently assigned."}

**Insights**
- Pipeline values and work order loads show clear concentration among top leads.
- Assignee allocation should be balanced to resolve delayed projects."""

    # 10. Stage Breakdown Intent
    if intent == "stage_breakdown":
        stages = summary.get("stage_breakdown", [])
        stage_str = "\n".join([f"- **{item['stage']}**: ${item['value']:,.2f} ({item['count']} deals)" for item in stages])
        
        return f"""**Executive Summary**
Active sales pipeline breakdown by stage:

{stage_str}

**Insights**
- Most active pipeline value sits in early-stage proposals.
- Focus is needed on moving negotiation deals through to won status."""

    # 11. General Business Health / Default Fallback
    total_val = summary.get("active_pipeline", 0.0)
    realized_rev = summary.get("realized_revenue", 0.0)
    completed = summary.get("completed_projects", 0)
    delayed = summary.get("delayed_projects", 0)
    
    return f"""**Executive Summary**
General Business Health Indicators:
- **Total Realized Revenue**: ${realized_rev:,.2f}
- **Active Sales Pipeline**: ${total_val:,.2f}
- **Completed Delivery Projects**: {completed}
- **Delayed Delivery Projects**: {delayed}

**Insights**
- Overall operations show healthy revenue capture coupled with a robust pipeline.
- Attention is needed on overdue delivery projects to protect customer margins.

**Recommendations**
- Deploy resources to clear overdue delivery items.
- Focus sales teams on pushing high-probability deals to closing."""

def _generate_mock_leadership_update(summary: Dict[str, Any]) -> str:
    """Generates a structured weekly leadership update matching the mock dataset."""
    overview = summary["business_overview"]
    pipe = summary["pipeline_health"]
    rev = summary["revenue_summary"]
    delays = summary["delayed_work_orders"]
    missing_notes = summary["data_completeness"]["missing_data_notes"]
    
    missing_str = "\n".join([f"- {note}" for note in missing_notes]) if missing_notes else "- No missing data detected."
    
    delayed_items_str = "\n".join([
        f"- **{item['name']}** (Due: {item['due_date']}, Lead: {item['assigned_to']})"
        for item in delays["delayed_items"]
    ])
    
    return f"""# Weekly Leadership Update — Skylark Drones

1. **Commercial Pipeline**
   - **Total Realized Revenue**: ${overview['revenue']['total_revenue']:,.2f} ({overview['revenue']['won_deals_count']} won deals).
   - **Open Pipeline Value**: ${overview['pipeline']['total_pipeline_value']:,.2f} across {overview['pipeline']['active_deals_count']} active opportunities.
   - **Expected Weighted Pipeline**: ${overview['pipeline']['weighted_pipeline_value']:,.2f}.

2. **Delivery & Operations**
   - **Total Work Orders**: {overview['delivery']['total_work_orders']}
   - **Completed Projects**: {overview['delivery']['completed_work_orders']}
   - **Active Projects**: {overview['delivery']['active_work_orders']} ({overview['delivery']['delayed_work_orders']} delayed).
   - **Operational Delay Rate**: {overview['delivery']['delay_rate']*100:.1f}%.

3. **Sector Performance**
   - **Mining**: Outstanding performance, driving ${rev['revenue_by_sector'].get('Mining', 0.0):,.2f} in won revenue.
   - **Energy**: Realized won revenue of ${rev['revenue_by_sector'].get('Energy', 0.0):,.2f}.
   - **Infrastructure**: Large open pipeline of ${summary['sector_analysis'].get('Infrastructure', {}).get('deals', {}).get('active_value', 0.0):,.2f}.

4. **Key Delivery Risks**
   The following projects are currently overdue and require intervention:
{delayed_items_str}

5. **Data Completeness Report**
   The following anomalies were resolved or noted from the Monday.com boards:
{missing_str}

6. **Actionable Recommendations**
   - **Operational Rescue**: Direct Dave and Eve to expedite the delayed Tata Steel and Adani Green work orders.
   - **Pipeline Acceleration**: Push the Rio Tinto ($300k, 80% prob) and NHAI ($250k, 70% prob) deals to close.
   - **Data Governance**: Enforce mandatory close date entry on the Deals board to clear pipeline blind spots.
"""
