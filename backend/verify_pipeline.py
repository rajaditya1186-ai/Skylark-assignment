"""
Script to verify pipeline metrics and diagnose where the pipeline sum becomes zero.
"""
import asyncio
import pandas as pd
from app import get_and_clean_data

async def main():
    # 1. Fetch and clean Deals board data
    deals_df, deals_meta, _, _ = await get_and_clean_data(refresh=True)
    
    # 2. Define quarter range based on the mock current date: 2026-07-27 (Q3 2026)
    start_of_quarter = pd.to_datetime("2026-07-01")
    end_of_quarter = pd.to_datetime("2026-09-30")
    
    # Ensure close dates are converted to datetime
    deals_df["expected_close_date_dt"] = pd.to_datetime(deals_df["expected_close_date"], errors="coerce")
    
    # Filter for active pipeline (exclude Won/Lost stages)
    active_df = deals_df[~deals_df["stage"].isin(["Won", "Lost"])].copy()
    
    # Filter for the current quarter (Q3 2026)
    current_quarter_df = active_df[
        (active_df["expected_close_date_dt"] >= start_of_quarter) &
        (active_df["expected_close_date_dt"] <= end_of_quarter)
    ]
    
    # Print the requested verification block
    print("=========================================")
    print("PIPELINE DIAGNOSTIC VERIFICATION")
    print("=========================================")
    print("Rows:", len(active_df))
    print("Deal Value Sum:", active_df["value"].sum())
    print("Non-null Deal Values:", active_df["value"].notna().sum())
    print("Expected Close Dates:", active_df["expected_close_date"].notna().sum())
    print("Current Quarter Rows:", len(current_quarter_df))
    print("Current Quarter Pipeline:", current_quarter_df["value"].sum())
    print("=========================================")

if __name__ == "__main__":
    asyncio.run(main())
