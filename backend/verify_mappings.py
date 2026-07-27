"""
Validation script to confirm mapping, column naming, and numeric conversions.
"""
import asyncio
from config import settings
from monday_client import MondayClient
from app import get_and_clean_data

monday_client = MondayClient()

async def main():
    print("=========================================")
    print("MAPPING & CLEANING VERIFICATION PASS")
    print("=========================================\n")
    
    # 1. Fetch raw data from Monday
    print("[1] Fetching raw board data...")
    raw_deals = await monday_client.get_deals()
    print(f" -> Fetched {len(raw_deals)} raw items from Deals board.\n")
    
    # 2. Print every Monday column title returned by the Deals board
    print("[2] Raw column titles on Deals board:")
    if raw_deals:
        sample_item = raw_deals[0]
        for val in sample_item.get("column_values", []):
            title = val.get("column", {}).get("title") if "column" in val else val.get("title")
            print(f"    - Title: '{title}', ID: '{val['id']}'")
    else:
        print("    No Deals items found to dump.")
    print()

    # 3. Show the field mapping from Monday titles to internal names
    print("[3] Field mapping configurations:")
    deals_mapping = {
        "Sector": "sector",
        "Deal Stage": "stage",
        "Deal Value": "value",
        "Probability": "probability",
        "Expected Close Date": "expected_close_date",
        "Owner": "owner"
    }
    for mon_title, internal_name in deals_mapping.items():
        print(f"    - Monday Title: '{mon_title}' -> Internal Name: '{internal_name}'")
    print()

    # 4. Process dataframe cleaning to verify parsed types
    print("[4] Executing clean pipeline...")
    deals_df, deals_meta, wo_df, wo_meta = await get_and_clean_data(refresh=True)
    
    print("\n[5] Verifying Deal Value numeric parsing:")
    if not deals_df.empty:
        sample_val = deals_df["value"].iloc[0]
        val_type = type(sample_val)
        print(f"    - Cleaned 'value' column dtype: {deals_df['value'].dtype}")
        print(f"    - Sample deal value: {sample_val} (Type: {val_type})")
        is_numeric = deals_df["value"].dtype in ["float64", "int64"]
        print(f"    - Confirming parsed numeric field: {is_numeric}")
    else:
        print("    Deals dataframe is empty.")
    print()

    # 6. Confirm Sector, Deal Stage, and Owner mapping
    print("[6] Confirming mapping completeness:")
    if not deals_df.empty:
        print(f"    - 'sector' column unique non-null values: {list(deals_df['sector'].dropna().unique())}")
        print(f"    - 'stage' column unique non-null values: {list(deals_df['stage'].dropna().unique())}")
        print(f"    - 'owner' column unique non-null values: {list(deals_df['owner'].dropna().unique())}")
    else:
        print("    Deals dataframe is empty.")

if __name__ == "__main__":
    asyncio.run(main())
