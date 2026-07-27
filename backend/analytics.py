"""
Business Analytics Engine.
Calculates business health, pipeline metrics, revenue forecasts, delayed work orders, and sector analysis.
Functions are pure, accepting cleaned DataFrames and returning JSON-serializable dictionaries.
All column references are in standard lowercase snake_case format.
"""
from typing import List, Dict, Any, Optional
import pandas as pd
import logging

logger = logging.getLogger(__name__)

STAGE_PROBABILITIES = {
    "A. Lead Generated": 10.0,
    "Lead": 10.0,
    "B. Sales Qualified Leads": 20.0,
    "C. Demo Done": 30.0,
    "D. Feasibility": 40.0,
    "I. Poc": 40.0,
    "E. Proposal/Commercials Sent": 60.0,
    "Proposal": 60.0,
    "F. Negotiations": 80.0,
    "Negotiation": 80.0,
    "H. Work Order Received": 95.0,
    "J. Invoice Sent": 95.0,
    "G. Project Won": 100.0,
    "Won": 100.0,
    "Project Completed": 100.0,
    "K. Amount Accrued": 100.0,
    "L. Project Lost": 0.0,
    "Lost": 0.0,
    "M. Projects On Hold": 0.0,
    "N. Not Relevant At The Moment": 0.0,
    "O. Not Relevant At All": 0.0
}

def pipeline_health(deals_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """
    Computes key performance indicators for active deals (pipeline).
    Filters out 'Won' and 'Lost' stages.
    """
    if deals_df.empty or "stage" not in deals_df.columns:
        return {
            "total_pipeline_value": 0.0,
            "weighted_pipeline_value": 0.0,
            "deal_count": 0,
            "stage_breakdown": {},
            "current_quarter_pipeline_value": 0.0,
            "current_quarter_deal_count": 0,
            "deals_without_close_date_count": 0
        }

    # Pipeline contains open deals (not Won, not Lost)
    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    
    total_val = float(open_deals["value"].sum())
    
    # Calculate weighted value: Value * (Probability / 100)
    # Uses stage-based defaults if probability is missing or 0.0
    def calc_weighted(row: pd.Series) -> float:
        val = row["value"]
        prob = row["probability"]
        stage = row.get("stage")
        
        if pd.isna(prob) or prob == 0.0:
            prob = STAGE_PROBABILITIES.get(str(stage), 20.0) # default to 20%
            
        if prob <= 1.0 and prob > 0:
            return float(val * prob)
        return float(val * (prob / 100.0))
        
    if not open_deals.empty:
        open_deals["weighted_value"] = open_deals.apply(calc_weighted, axis=1)
        weighted_val = float(open_deals["weighted_value"].sum())
    else:
        weighted_val = 0.0

    # Current quarter calculations (Q3 2026 if current_date is 2026-07-27)
    q_pipeline = 0.0
    q_count = 0
    no_close_date_count = 0
    
    if not open_deals.empty:
        no_close_date_count = int(
            (
                (open_deals["expected_close_date"].isna()) | 
                (open_deals["expected_close_date"] == "") |
                (open_deals["expected_close_date"].astype(str).str.strip() == "")
            ).sum()
        )
        
        # Quarter range
        try:
            current_dt = pd.to_datetime(current_date)
            q_start = current_dt.to_period("Q").start_time
            q_end = current_dt.to_period("Q").end_time
            
            # Close dates to datetime Series
            close_dt = pd.to_datetime(open_deals["expected_close_date"], errors="coerce")
            q_deals = open_deals[
                (close_dt >= q_start) &
                (close_dt <= q_end)
            ]
            q_pipeline = float(q_deals["value"].sum())
            q_count = int(len(q_deals))
        except Exception as e:
            logger.warning(f"Error calculating quarter bounds: {e}")

    # Stage breakdown
    stage_groups = open_deals.groupby("stage")
    stage_breakdown = {}
    for stage, group in stage_groups:
        stage_breakdown[str(stage)] = {
            "value": float(group["value"].sum()),
            "count": int(len(group))
        }

    return {
        "total_pipeline_value": total_val,
        "weighted_pipeline_value": weighted_val,
        "deal_count": int(len(open_deals)),
        "stage_breakdown": stage_breakdown,
        "current_quarter_pipeline_value": q_pipeline,
        "current_quarter_deal_count": q_count,
        "deals_without_close_date_count": no_close_date_count
    }

def sector_analysis(deals_df: pd.DataFrame, work_orders_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyzes commercial pipeline and delivery metrics broken down by industry sector.
    """
    sectors = set()
    if not deals_df.empty and "sector" in deals_df.columns:
        sectors.update(deals_df["sector"].dropna().unique())
    if not work_orders_df.empty and "sector" in work_orders_df.columns:
        sectors.update(work_orders_df["sector"].dropna().unique())

    result = {}
    for sector in sectors:
        if not sector:
            continue
            
        sector_str = str(sector)
        result[sector_str] = {
            "deals": {
                "total_value": 0.0,
                "won_value": 0.0,
                "active_value": 0.0,
                "deal_count": 0,
                "won_count": 0
            },
            "work_orders": {
                "total_count": 0,
                "completed_count": 0,
                "delayed_count": 0,
                "in_progress_count": 0
            }
        }

        # Deal metrics for sector
        if not deals_df.empty and "sector" in deals_df.columns:
            s_deals = deals_df[deals_df["sector"] == sector]
            if not s_deals.empty:
                result[sector_str]["deals"] = {
                    "total_value": float(s_deals["value"].sum()),
                    "won_value": float(s_deals[s_deals["stage"] == "Won"]["value"].sum()),
                    "active_value": float(s_deals[~s_deals["stage"].isin(["Won", "Lost"])]["value"].sum()),
                    "deal_count": int(len(s_deals)),
                    "won_count": int(len(s_deals[s_deals["stage"] == "Won"]))
                }

        # Work order metrics for sector
        if not work_orders_df.empty and "sector" in work_orders_df.columns:
            s_wo = work_orders_df[work_orders_df["sector"] == sector]
            if not s_wo.empty:
                # Determine delays
                delayed_mask = (s_wo["status"] == "Delayed")
                current_date = "2026-07-27"
                overdue_mask = (
                    (~s_wo["status"].isin(["Completed"])) & 
                    (s_wo["due_date"].notna()) & 
                    (s_wo["due_date"] < current_date)
                )
                total_delayed = int((delayed_mask | overdue_mask).sum())
                
                result[sector_str]["work_orders"] = {
                    "total_count": int(len(s_wo)),
                    "completed_count": int((s_wo["status"] == "Completed").sum()),
                    "delayed_count": total_delayed,
                    "in_progress_count": int((s_wo["status"] == "In Progress").sum())
                }

    return result

def revenue_summary(deals_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes completed revenue metrics based on closed-won deals.
    """
    if deals_df.empty or "stage" not in deals_df.columns:
        return {
            "total_revenue": 0.0,
            "won_deals_count": 0,
            "revenue_by_sector": {},
            "revenue_by_month": {}
        }

    won_deals = deals_df[deals_df["stage"] == "Won"].copy()
    
    total_rev = float(won_deals["value"].sum())
    
    # Revenue by sector
    rev_by_sector = {}
    if not won_deals.empty and "sector" in won_deals.columns:
        sector_groups = won_deals.groupby("sector")
        for sector, group in sector_groups:
            if sector:
                rev_by_sector[str(sector)] = float(group["value"].sum())
                
    # Revenue by month
    rev_by_month = {}
    if not won_deals.empty and "expected_close_date" in won_deals.columns:
        won_deals["month"] = won_deals["expected_close_date"].apply(
            lambda x: str(x)[:7] if pd.notna(x) else "Unknown"
        )
        month_groups = won_deals.groupby("month")
        for month, group in month_groups:
            rev_by_month[str(month)] = float(group["value"].sum())

    return {
        "total_revenue": total_rev,
        "won_deals_count": int(len(won_deals)),
        "revenue_by_sector": rev_by_sector,
        "revenue_by_month": rev_by_month
    }

def delayed_work_orders(work_orders_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """
    Identifies delayed work orders.
    A work order is delayed if status is 'Delayed', or if it is incomplete and past its due date.
    """
    if work_orders_df.empty or "status" not in work_orders_df.columns:
        return {
            "total_delayed_count": 0,
            "delayed_items": [],
            "delayed_by_sector": {},
            "delayed_by_assignee": {}
        }

    wo = work_orders_df.copy()
    
    # Define delayed logic
    delayed_status_mask = (wo["status"] == "Delayed")
    overdue_mask = (
        (~wo["status"].isin(["Completed"])) & 
        (wo["due_date"].notna()) & 
        (wo["due_date"] < current_date)
    )
    
    wo["is_delayed"] = delayed_status_mask | overdue_mask
    delayed_df = wo[wo["is_delayed"]].copy()

    # Delayed items list
    delayed_items = []
    for _, row in delayed_df.iterrows():
        delayed_items.append({
            "id": str(row["id"]),
            "name": str(row["name"]),
            "status": str(row["status"]),
            "sector": str(row["sector"]) if pd.notna(row["sector"]) else "Unassigned",
            "due_date": str(row["due_date"]) if pd.notna(row["due_date"]) else "None",
            "assigned_to": str(row["assigned_to"]) if pd.notna(row["assigned_to"]) else "Unassigned"
        })

    # Sector breakdown
    delayed_by_sector = {}
    if not delayed_df.empty and "sector" in delayed_df.columns:
        sector_groups = delayed_df.groupby("sector", dropna=False)
        for sector, group in sector_groups:
            label = str(sector) if pd.notna(sector) else "Unassigned"
            delayed_by_sector[label] = int(len(group))

    # Assignee breakdown
    delayed_by_assignee = {}
    if not delayed_df.empty and "assigned_to" in delayed_df.columns:
        assignee_groups = delayed_df.groupby("assigned_to", dropna=False)
        for assignee, group in assignee_groups:
            label = str(assignee) if pd.notna(assignee) else "Unassigned"
            delayed_by_assignee[label] = int(len(group))

    return {
        "total_delayed_count": int(len(delayed_df)),
        "delayed_items": delayed_items,
        "delayed_by_sector": delayed_by_sector,
        "delayed_by_assignee": delayed_by_assignee
    }

def monthly_forecast(deals_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Forecasts incoming revenue by month for open pipeline deals.
    """
    if deals_df.empty or "stage" not in deals_df.columns:
        return {}

    # Open deals only
    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    if open_deals.empty:
        return {}

    # Create close month field (YYYY-MM)
    open_deals["month"] = open_deals["expected_close_date"].apply(
        lambda x: str(x)[:7] if pd.notna(x) else "Missing Date"
    )

    def calc_weighted(row: pd.Series) -> float:
        val = row["value"]
        prob = row["probability"]
        if prob <= 1.0:
            return float(val * prob)
        return float(val * (prob / 100.0))

    open_deals["weighted_value"] = open_deals.apply(calc_weighted, axis=1)
    
    month_groups = open_deals.groupby("month")
    forecast = {}
    
    for month, group in month_groups:
        month_str = str(month)
        forecast[month_str] = {
            "unweighted_value": float(group["value"].sum()),
            "weighted_value": float(group["weighted_value"].sum()),
            "deal_count": int(len(group))
        }
        
    return forecast

def business_overview(deals_df: pd.DataFrame, work_orders_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """
    Computes high-level business performance KPIs.
    """
    # Revenue won
    rev_info = revenue_summary(deals_df)
    total_rev = rev_info["total_revenue"]
    won_count = rev_info["won_deals_count"]

    # Active pipeline
    pipe_info = pipeline_health(deals_df, current_date)
    total_pipe = pipe_info["total_pipeline_value"]
    weighted_pipe = pipe_info["weighted_pipeline_value"]
    active_deals = pipe_info["deal_count"]

    # Work Order KPIs
    total_wo = len(work_orders_df)
    if total_wo > 0:
        completed_wo = int((work_orders_df["status"] == "Completed").sum())
        delayed_info = delayed_work_orders(work_orders_df, current_date)
        delayed_wo = delayed_info["total_delayed_count"]
        active_wo = total_wo - completed_wo
        delay_rate = float(delayed_wo / total_wo) if total_wo > 0 else 0.0
    else:
        completed_wo = 0
        delayed_wo = 0
        active_wo = 0
        delay_rate = 0.0

    return {
        "revenue": {
            "total_revenue": total_rev,
            "won_deals_count": won_count
        },
        "pipeline": {
            "total_pipeline_value": total_pipe,
            "weighted_pipeline_value": weighted_pipe,
            "active_deals_count": active_deals
        },
        "delivery": {
            "total_work_orders": total_wo,
            "completed_work_orders": completed_wo,
            "delayed_work_orders": delayed_wo,
            "active_work_orders": active_wo,
            "delay_rate": delay_rate
        }
    }

def leadership_summary(
    deals_df: pd.DataFrame,
    deals_meta: Dict[str, Any],
    work_orders_df: pd.DataFrame,
    work_orders_meta: Dict[str, Any],
    current_date: str = "2026-07-27"
) -> Dict[str, Any]:
    """
    Composes all analytical views into a single, cohesive, JSON-serializable structure.
    """
    overview = business_overview(deals_df, work_orders_df, current_date)
    pipe = pipeline_health(deals_df, current_date)
    rev = revenue_summary(deals_df)
    sectors = sector_analysis(deals_df, work_orders_df)
    delays = delayed_work_orders(work_orders_df, current_date)
    forecast = monthly_forecast(deals_df)

    # Assess overall data quality / completeness
    deals_missing = sum(deals_meta.get("missing_fields", {}).values())
    wo_missing = sum(work_orders_meta.get("missing_fields", {}).values())
    
    data_complete = (deals_missing == 0 and wo_missing == 0)

    # Compile descriptive missing data logs
    missing_data_notes = []
    
    # 1. Deals missing board columns (schema issues)
    deals_missing_cols = deals_meta.get("missing_board_columns", [])
    if "sector" in deals_missing_cols:
        missing_data_notes.append("Sector/service analysis unavailable: the Deals board does not contain a Sector column.")
        
    # 2. Deals row-level issues
    for col, count in deals_meta.get("missing_fields", {}).items():
        if col in deals_missing_cols:
            continue
        if count > 0:
            if count == deals_meta.get("total_rows", 0):
                if col == "owner":
                    missing_data_notes.append("No deal owners are currently assigned in the Deals board. This limits owner-level reporting and accountability analysis.")
                else:
                    missing_data_notes.append(f"Deals board: all values are empty in '{col}' column.")
            else:
                missing_data_notes.append(f"Deals board: {count} values missing/malformed in '{col}' column.")
                
    # 3. Work Orders missing board columns
    wo_missing_cols = work_orders_meta.get("missing_board_columns", [])
    if "sector" in wo_missing_cols:
        missing_data_notes.append("Sector/service analysis unavailable: the Work Orders board does not contain a Sector column.")
        
    # 4. Work Orders row-level issues
    for col, count in work_orders_meta.get("missing_fields", {}).items():
        if col in wo_missing_cols:
            continue
        if count > 0:
            if count == work_orders_meta.get("total_rows", 0):
                if col == "assigned_to":
                    missing_data_notes.append("No project assignees are currently assigned in the Work Orders board. This limits resource utilization and accountability analysis.")
                else:
                    missing_data_notes.append(f"Work Orders board: all values are empty in '{col}' column.")
            else:
                missing_data_notes.append(f"Work Orders board: {count} values missing/malformed in '{col}' column.")

    if deals_meta.get("dropped_rows", 0) > 0:
        missing_data_notes.append(f"Deals board: {deals_meta['dropped_rows']} duplicate row(s) dropped.")
    if work_orders_meta.get("dropped_rows", 0) > 0:
        missing_data_notes.append(f"Work Orders board: {work_orders_meta['dropped_rows']} duplicate row(s) dropped.")

    # Compute charts for structured payloads
    stages_counts = deals_df["stage"].value_counts() if not deals_df.empty and "stage" in deals_df.columns else pd.Series()
    won_count = int(stages_counts.get("Won", 0))
    lost_count = int(stages_counts.get("Lost", 0))
    open_count = int(pipe["deal_count"])

    return {
        "business_overview": overview,
        "pipeline_health": pipe,
        "revenue_summary": rev,
        "sector_analysis": sectors,
        "delayed_work_orders": delays,
        "monthly_forecast": forecast,
        "charts": {
            "pipeline_stage": charts_pipeline_stage(deals_df),
            "revenue_forecast": charts_revenue_forecast(deals_df, current_date),
            "work_orders": charts_work_orders(work_orders_df),
            "top_deals": charts_top_deals(deals_df),
            "probability_distribution": charts_closure_probability(deals_df),
            "opportunity_distribution": [
                {"name": "Open", "value": open_count},
                {"name": "Won", "value": won_count},
                {"name": "Lost", "value": lost_count}
            ]
        },
        "data_completeness": {
            "is_complete": data_complete,
            "missing_data_notes": missing_data_notes,
            "deals_metadata": deals_meta,
            "work_orders_metadata": work_orders_meta
        }
    }

# --- Dashboard & Visualizations Analytics Section ---

def charts_pipeline_stage(deals_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Groups active deals by deal stage and sums their values.
    """
    if deals_df.empty or "stage" not in deals_df.columns:
        return []
    
    # Open deals only
    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    if open_deals.empty:
        return []
        
    grouped = open_deals.groupby("stage")["value"].agg(["sum", "count"]).reset_index()
    grouped.columns = ["stage", "value", "count"]
    # Sort descending
    grouped = grouped.sort_values(by="value", ascending=False)
    
    return [
        {
            "stage": str(row["stage"]),
            "value": float(row["value"]),
            "count": int(row["count"])
        }
        for _, row in grouped.iterrows()
    ]

def charts_revenue_forecast(deals_df: pd.DataFrame, current_date: str = "2026-07-27") -> List[Dict[str, Any]]:
    """
    Forecasts unweighted and expected weighted pipeline value for the next 6 calendar months.
    """
    if deals_df.empty or "expected_close_date" not in deals_df.columns:
        return []

    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    
    # Calculate next 6 months starting from current_date's month
    try:
        start_month = pd.to_datetime(current_date).to_period("M")
    except Exception:
        start_month = pd.to_datetime("2026-07-01").to_period("M")
        
    forecast_months = [start_month + i for i in range(6)]
    forecast_keys = [str(m) for m in forecast_months]
    
    # Prepare mapping
    forecast_data = {m: {"unweighted_value": 0.0, "weighted_value": 0.0, "deal_count": 0} for m in forecast_keys}
    
    if not open_deals.empty:
        open_deals["month"] = pd.to_datetime(open_deals["expected_close_date"], errors="coerce").dt.to_period("M").astype(str)
        
        # Calculate weighted value
        def calc_weighted(row: pd.Series) -> float:
            val = row["value"]
            prob = row["probability"]
            stage = row.get("stage")
            if pd.isna(prob) or prob == 0.0:
                prob = STAGE_PROBABILITIES.get(str(stage), 20.0)
            if prob <= 1.0 and prob > 0:
                return float(val * prob)
            return float(val * (prob / 100.0))
            
        open_deals["weighted_value"] = open_deals.apply(calc_weighted, axis=1)
        
        for _, row in open_deals.iterrows():
            m = str(row["month"])
            if m in forecast_data:
                forecast_data[m]["unweighted_value"] += float(row["value"])
                forecast_data[m]["weighted_value"] += float(row["weighted_value"])
                forecast_data[m]["deal_count"] += 1
                
    # Return formatted list
    return [
        {
            "month": m,
            "unweighted_value": round(forecast_data[m]["unweighted_value"], 2),
            "weighted_value": round(forecast_data[m]["weighted_value"], 2),
            "deal_count": forecast_data[m]["deal_count"]
        }
        for m in forecast_keys
    ]

def charts_work_orders(work_orders_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Returns counts of work orders grouped by status.
    Ensures standard categories (Completed, In Progress, Pending, Delayed, Cancelled) exist.
    """
    categories = ["Completed", "In Progress", "Pending", "Delayed", "Cancelled"]
    counts = {cat: 0 for cat in categories}
    
    if not work_orders_df.empty and "status" in work_orders_df.columns:
        # Map statuses
        def normalize_status(status_str: Any) -> str:
            if pd.isna(status_str):
                return "Pending"
            s = str(status_str).strip().lower()
            if s in ("completed", "complete", "won", "done"):
                return "Completed"
            if s in ("in progress", "inprogress", "active", "executed until current month"):
                return "In Progress"
            if s in ("delayed", "overdue", "blocked"):
                return "Delayed"
            if s in ("cancelled", "canceled", "lost", "stopped"):
                return "Cancelled"
            return "Pending" # Default/Not Started -> Pending
            
        mapped_status = work_orders_df["status"].apply(normalize_status)
        val_counts = mapped_status.value_counts()
        for cat in categories:
            counts[cat] = int(val_counts.get(cat, 0))
            
    return [{"status": cat, "count": counts[cat]} for cat in categories]

def charts_top_deals(deals_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Returns the top 10 highest value active deals.
    """
    if deals_df.empty:
        return []
        
    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    if open_deals.empty:
        return []
        
    top_deals = open_deals.sort_values(by="value", ascending=False).head(10)
    
    return [
        {
            "name": str(row["name"]),
            "value": float(row["value"]),
            "stage": str(row["stage"]),
            "expected_close_date": str(row["expected_close_date"]) if pd.notna(row["expected_close_date"]) else "None"
        }
        for _, row in top_deals.iterrows()
    ]

def charts_closure_probability(deals_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Returns count distribution of active deals across probability buckets.
    """
    buckets = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
    counts = {b: 0 for b in buckets}
    
    if not deals_df.empty:
        open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
        
        # Populate missing probability with stage defaults
        def get_prob(row: pd.Series) -> float:
            prob = row["probability"]
            stage = row.get("stage")
            if pd.isna(prob) or prob == 0.0:
                return STAGE_PROBABILITIES.get(str(stage), 20.0)
            return prob if prob > 1.0 else prob * 100.0
            
        if not open_deals.empty:
            probs = open_deals.apply(get_prob, axis=1)
            
            for p in probs:
                if p <= 20.0:
                    counts["0-20%"] += 1
                elif p <= 40.0:
                    counts["20-40%"] += 1
                elif p <= 60.0:
                    counts["40-60%"] += 1
                elif p <= 80.0:
                    counts["60-80%"] += 1
                else:
                    counts["80-100%"] += 1
                    
    return [{"range": b, "count": counts[b]} for b in buckets]

def data_quality_report(
    deals_df: pd.DataFrame,
    deals_meta: Dict[str, Any],
    work_orders_df: pd.DataFrame,
    work_orders_meta: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generates counts and status levels (green, yellow, red) for data quality metrics.
    """
    total_deals = int(deals_meta.get("total_rows", 0))
    total_wo = int(work_orders_meta.get("total_rows", 0))
    
    # 1. Missing Close Dates
    missing_dates = int(deals_meta.get("missing_fields", {}).get("expected_close_date", 0))
    dates_status = "green"
    if missing_dates > 0:
        dates_status = "yellow" if (missing_dates / max(total_deals, 1) <= 0.3) else "red"
        
    # 2. Missing Owners
    missing_owners = int(deals_meta.get("missing_fields", {}).get("owner", 0))
    owners_status = "green"
    if missing_owners > 0:
        owners_status = "yellow" if (missing_owners / max(total_deals, 1) <= 0.3) else "red"
        
    # 3. Missing Status (Work Orders)
    missing_status = int(work_orders_meta.get("missing_fields", {}).get("status", 0))
    status_status = "green"
    if missing_status > 0:
        status_status = "yellow" if (missing_status / max(total_wo, 1) <= 0.1) else "red"
        
    # 4. Duplicate Deals
    duplicate_deals = int(deals_meta.get("dropped_rows", 0))
    dup_status = "green" if duplicate_deals == 0 else "yellow"
    
    # 5. Invalid Values (Generic count, e.g., unparseable values)
    # Estimate based on other fields in meta
    invalid_count = sum(
        count for col, count in deals_meta.get("missing_fields", {}).items() 
        if col not in ("expected_close_date", "owner", "sector")
    )
    invalid_status = "green" if invalid_count == 0 else "yellow"
    
    # 6. Missing Columns
    missing_cols = list(set(deals_meta.get("missing_board_columns", []) + work_orders_meta.get("missing_board_columns", [])))
    cols_status = "green"
    if missing_cols:
        cols_status = "yellow" if len(missing_cols) <= 2 else "red"
        
    return {
        "missing_close_dates": {"count": missing_dates, "status": dates_status},
        "missing_owners": {"count": missing_owners, "status": owners_status},
        "missing_status": {"count": missing_status, "status": status_status},
        "duplicate_deals": {"count": duplicate_deals, "status": dup_status},
        "invalid_values": {"count": invalid_count, "status": invalid_status},
        "missing_columns": {"count": len(missing_cols), "details": missing_cols, "status": cols_status}
    }

def dashboard_analytics(
    deals_df: pd.DataFrame,
    deals_meta: Dict[str, Any],
    work_orders_df: pd.DataFrame,
    work_orders_meta: Dict[str, Any],
    current_date: str = "2026-07-27"
) -> Dict[str, Any]:
    """
    Prepares high-level KPIs, charts data, insights, and data quality summary for the BI dashboard.
    """
    pipe = pipeline_health(deals_df, current_date)
    wo_stats = charts_work_orders(work_orders_df)
    
    # KPIs
    kpis = {
        "total_pipeline": {
            "value": pipe["total_pipeline_value"],
            "description": "Total value of all open deals"
        },
        "weighted_pipeline": {
            "value": pipe["weighted_pipeline_value"],
            "description": "Risk-adjusted active value"
        },
        "open_opportunities": {
            "value": pipe["deal_count"],
            "description": "Active sales opportunities"
        },
        "current_quarter_pipeline": {
            "value": pipe["current_quarter_pipeline_value"],
            "description": f"Forecasted to close in Q3 ({pipe['current_quarter_deal_count']} deals)"
        },
        "completed_work_orders": {
            "value": next((item["count"] for item in wo_stats if item["status"] == "Completed"), 0),
            "description": "Successfully delivered contracts"
        },
        "delayed_work_orders": {
            "value": next((item["count"] for item in wo_stats if item["status"] == "Delayed"), 0),
            "description": "Projects experiencing execution delays"
        }
    }

    # Chart Data
    charts = {
        "pipeline_stage": charts_pipeline_stage(deals_df),
        "revenue_forecast": charts_revenue_forecast(deals_df, current_date),
        "work_orders": wo_stats,
        "top_deals": charts_top_deals(deals_df),
        "probability_distribution": charts_closure_probability(deals_df)
    }

    # Data Quality
    dq = data_quality_report(deals_df, deals_meta, work_orders_df, work_orders_meta)

    # Dynamic Insights Generation
    insights = []
    
    # Insight 1: Concentration
    top_deals_list = charts["top_deals"]
    if top_deals_list:
        total_top_5 = sum(d["value"] for d in top_deals_list[:5])
        pct_concentration = (total_top_5 / max(kpis["total_pipeline"]["value"], 1)) * 100
        if pct_concentration >= 50.0:
            insights.append(f"Pipeline heavily concentrated in top 5 opportunities ({pct_concentration:.1f}% of total value).")
            
    # Insight 2: Top Stage
    stages = charts["pipeline_stage"]
    if stages:
        top_stage = stages[0]["stage"]
        insights.append(f"Most active pipeline value sits in '{top_stage}' stage (${stages[0]['value']:,.2f}).")
        
    # Insight 3: Q3 closing
    q_count = pipe["current_quarter_deal_count"]
    insights.append(f"Only {q_count} opportunities are forecast to close in the current quarter." if q_count <= 5 else f"{q_count} opportunities are expected to close this quarter.")
    
    # Insight 4: Missing close dates
    missing_dates = dq["missing_close_dates"]["count"]
    if missing_dates > 0:
        insights.append(f"{missing_dates} open opportunities have no expected close date, reducing forecast accuracy.")
        
    # Insight 5: Confidence
    pct_missing = (missing_dates / max(pipe["deal_count"], 1)) * 100
    confidence = "High" if pct_missing == 0 else ("Medium" if pct_missing <= 30 else "Low")
    insights.append(f"Revenue forecast confidence: {confidence}.")

    # Pie Chart distribution (Open vs Won vs Lost)
    stages_raw = deals_df["stage"].value_counts() if not deals_df.empty and "stage" in deals_df.columns else pd.Series()
    won_count = int(stages_raw.get("Won", 0))
    lost_count = int(stages_raw.get("Lost", 0))
    open_count = int(pipe["deal_count"])
    charts["opportunity_distribution"] = [
        {"name": "Open", "value": open_count},
        {"name": "Won", "value": won_count},
        {"name": "Lost", "value": lost_count}
    ]

    return {
        "kpis": kpis,
        "charts": charts,
        "insights": insights,
        "data_quality": dq
    }

# --- Intent-Aware Analytics Handlers ---

def pipeline_summary_analytics(deals_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """Computes KPIs and metrics strictly for the 'pipeline_summary' intent."""
    pipe = pipeline_health(deals_df, current_date)
    return {
        "total_pipeline_value": float(pipe["total_pipeline_value"]),
        "weighted_pipeline_value": float(pipe["weighted_pipeline_value"]),
        "deal_count": int(pipe["deal_count"]),
        "current_quarter_pipeline_value": float(pipe["current_quarter_pipeline_value"]),
        "current_quarter_deal_count": int(pipe["current_quarter_deal_count"]),
        "deals_without_close_date_count": int(pipe["deals_without_close_date_count"])
    }

def open_opportunities_analytics(deals_df: pd.DataFrame) -> Dict[str, Any]:
    """Computes opportunities metrics strictly for the 'open_opportunities' intent."""
    open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])]
    stages = open_deals["stage"].value_counts().to_dict()
    # Format counts
    stages_clean = {str(k): int(v) for k, v in stages.items()}
    return {
        "open_opportunities_count": int(len(open_deals)),
        "opportunities_by_stage_count": stages_clean
    }

def top_deals_analytics(deals_df: pd.DataFrame) -> Dict[str, Any]:
    """Computes top deals metrics strictly for the 'top_deals' intent."""
    top_10 = charts_top_deals(deals_df)
    return {
        "top_deals": top_10
    }

def delayed_work_orders_analytics(work_orders_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """Computes work order delays strictly for the 'delayed_work_orders' intent."""
    delays = delayed_work_orders(work_orders_df, current_date)
    return {
        "delayed_work_orders_count": int(delays["total_delayed_count"]),
        "delayed_items": delays["delayed_items"]
    }

def work_order_summary_analytics(work_orders_df: pd.DataFrame) -> Dict[str, Any]:
    """Computes work order breakdown strictly for the 'work_order_summary' intent."""
    status_counts = charts_work_orders(work_orders_df)
    total_count = len(work_orders_df)
    return {
        "total_work_orders_count": int(total_count),
        "status_distribution": status_counts
    }

def revenue_forecast_analytics(deals_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """Computes rolling forecasts strictly for the 'revenue_forecast' intent."""
    forecast = charts_revenue_forecast(deals_df, current_date)
    return {
        "revenue_forecast_6_months": forecast
    }

def leadership_summary_analytics(
    deals_df: pd.DataFrame, 
    deals_meta: Dict[str, Any], 
    work_orders_df: pd.DataFrame, 
    work_orders_meta: Dict[str, Any], 
    current_date: str = "2026-07-27"
) -> Dict[str, Any]:
    """Computes full leadership KPIs, charts, and governance checks strictly for the 'leadership_summary' intent."""
    return leadership_summary(deals_df, deals_meta, work_orders_df, work_orders_meta, current_date)

def pipeline_vs_work_orders_analytics(deals_df: pd.DataFrame, work_orders_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """Computes comparative metrics strictly for the 'pipeline_vs_work_orders' intent."""
    pipe = pipeline_health(deals_df, current_date)
    wo_stats = charts_work_orders(work_orders_df)
    completed = int(next((item["count"] for item in wo_stats if item["status"] == "Completed"), 0))
    delayed = int(next((item["count"] for item in wo_stats if item["status"] == "Delayed"), 0))
    ratio = float(pipe["deal_count"]) / max(completed, 1)
    
    return {
        "active_deals_count": int(pipe["deal_count"]),
        "active_pipeline_value": float(pipe["total_pipeline_value"]),
        "completed_projects_count": completed,
        "delayed_projects_count": delayed,
        "deals_to_delivery_ratio": round(ratio, 2)
    }

def data_quality_analytics(
    deals_df: pd.DataFrame, 
    deals_meta: Dict[str, Any], 
    work_orders_df: pd.DataFrame, 
    work_orders_meta: Dict[str, Any]
) -> Dict[str, Any]:
    """Computes governance metrics strictly for the 'data_quality' intent."""
    return data_quality_report(deals_df, deals_meta, work_orders_df, work_orders_meta)

def owner_analysis_analytics(deals_df: pd.DataFrame, work_orders_df: pd.DataFrame) -> Dict[str, Any]:
    """Computes owner concentration strictly for the 'owner_analysis' intent."""
    deals_by_owner = {}
    if not deals_df.empty and "owner" in deals_df.columns:
        open_deals = deals_df[~deals_df["stage"].isin(["Won", "Lost"])]
        grouped = open_deals.groupby("owner")
        for owner, group in grouped:
            deals_by_owner[str(owner)] = {
                "value": float(group["value"].sum()),
                "count": int(len(group))
            }
            
    wo_by_assignee = {}
    if not work_orders_df.empty and "assigned_to" in work_orders_df.columns:
        grouped_wo = work_orders_df.groupby("assigned_to")
        for assignee, group in grouped_wo:
            # check delayed count
            delayed_count = int((group["status"].astype(str).str.strip().lower().isin(["delayed", "overdue"])).sum())
            wo_by_assignee[str(assignee)] = {
                "total_count": int(len(group)),
                "delayed_count": delayed_count
            }
            
    return {
        "deals_by_owner": deals_by_owner,
        "work_orders_by_assignee": wo_by_assignee
    }

def stage_breakdown_analytics(deals_df: pd.DataFrame) -> Dict[str, Any]:
    """Computes sales stage conversions strictly for the 'stage_breakdown' intent."""
    stages = charts_pipeline_stage(deals_df)
    return {
        "stage_breakdown": stages
    }

def general_business_health_analytics(deals_df: pd.DataFrame, work_orders_df: pd.DataFrame, current_date: str = "2026-07-27") -> Dict[str, Any]:
    """Computes high level overall indicators strictly for the 'general_business_health' intent."""
    pipe = pipeline_health(deals_df, current_date)
    wo_stats = charts_work_orders(work_orders_df)
    completed = int(next((item["count"] for item in wo_stats if item["status"] == "Completed"), 0))
    delayed = int(next((item["count"] for item in wo_stats if item["status"] == "Delayed"), 0))
    
    # Realized revenue
    won_deals = deals_df[deals_df["stage"] == "Won"]
    realized_revenue = float(won_deals["value"].sum())
    
    return {
        "realized_revenue": realized_revenue,
        "active_pipeline": float(pipe["total_pipeline_value"]),
        "completed_projects": completed,
        "delayed_projects": delayed
    }

