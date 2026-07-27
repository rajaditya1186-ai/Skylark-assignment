"""
Data cleaning and normalization engine.
Converts raw Monday.com GraphQL payloads into cleaned pandas DataFrames.
Enforces purity: all functions copy and return data, tracking modifications in a metadata report.
"""
import logging
import re
from typing import List, Dict, Any, Tuple
import pandas as pd

logger = logging.getLogger(__name__)

def raw_items_to_df(items: List[Dict[str, Any]], expected_columns: Dict[str, str]) -> pd.DataFrame:
    """
    Converts raw Monday.com GraphQL item dictionaries into a flat pandas DataFrame.
    Maps Monday column titles to lowercase snake_case schema fields.
    """
    flat_items = []
    for item in items:
        flat_item = {
            "id": str(item.get("id", "")).strip(),
            "name": str(item.get("name", "")).strip()
        }
        
        column_values = item.get("column_values", [])
        # Extract title and text mapping
        col_map = {}
        for col in column_values:
            title = col.get("title")
            text = col.get("text")
            if title:
                col_map[title.strip()] = text.strip() if text is not None else None
        
        # Populate expected fields
        for title, field_name in expected_columns.items():
            val = col_map.get(title)
            if val is not None or field_name not in flat_item or flat_item[field_name] is None:
                flat_item[field_name] = val
            
        flat_items.append(flat_item)
        
    return pd.DataFrame(flat_items)

def deduplicate(df: pd.DataFrame, meta: Dict[str, Any]) -> pd.DataFrame:
    """
    Removes duplicate entries based on the unique Monday.com item ID.
    """
    if df.empty:
        return df.copy()

    before_count = len(df)
    cleaned_df = df.drop_duplicates(subset=["id"], keep="first").copy()
    after_count = len(cleaned_df)
    
    dropped = before_count - after_count
    if dropped > 0:
        meta["dropped_rows"] = meta.get("dropped_rows", 0) + dropped
        logger.info(f"Deduplicated: dropped {dropped} duplicate items.")
        
    return cleaned_df

def normalize_text(df: pd.DataFrame, text_cols: List[str], meta: Dict[str, Any]) -> pd.DataFrame:
    """
    Normalizes text fields: strips spaces and standardizes categories.
    """
    if df.empty:
        return df.copy()

    cleaned_df = df.copy()
    for col in text_cols:
        if col not in cleaned_df.columns:
            continue
            
        # Coerce to clean text strings or None
        cleaned_df[col] = cleaned_df[col].apply(lambda x: str(x).strip() if pd.notna(x) else None)
        cleaned_df[col] = cleaned_df[col].apply(lambda x: None if x == "" else x)

        # Standardize categories
        if col == "sector":
            # standard: Mining, Energy, Infrastructure, Agriculture
            def clean_sector(val: Any) -> Any:
                if val is None or pd.isna(val):
                    return None
                val_str = str(val).strip().title()
                if val_str in ("Agri", "Agro"):
                    return "Agriculture"
                if val_str in ("Infra", "Construction"):
                    return "Infrastructure"
                if val_str in ("Power", "Renewables"):
                    return "Energy"
                return val_str
            cleaned_df[col] = cleaned_df[col].apply(clean_sector)
            
        elif col == "stage":
            # standard: Won, Lost, Proposal, Negotiation, Lead
            def clean_stage(val: Any) -> Any:
                if val is None or pd.isna(val):
                    return None
                val_str = str(val).strip().title()
                if val_str.upper() in ("WON", "WON DEAL", "CLOSED WON"):
                    return "Won"
                if val_str.upper() in ("LOST", "LOST DEAL", "CLOSED LOST"):
                    return "Lost"
                return val_str
            cleaned_df[col] = cleaned_df[col].apply(clean_stage)
            
        elif col == "status":
            # standard: Completed, In Progress, Delayed, Not Started
            def clean_status(val: Any) -> Any:
                if val is None or pd.isna(val):
                    return None
                val_str = str(val).strip().title()
                if val_str.lower() in ("in progress", "inprogress", "active"):
                    return "In Progress"
                if val_str.lower() in ("not started", "notstarted", "backlog"):
                    return "Not Started"
                if val_str.lower() in ("delayed", "overdue", "blocked"):
                    return "Delayed"
                return val_str
            cleaned_df[col] = cleaned_df[col].apply(clean_status)

    return cleaned_df

def normalize_dates(df: pd.DataFrame, date_cols: List[str], meta: Dict[str, Any]) -> pd.DataFrame:
    """
    Normalizes dates to YYYY-MM-DD format.
    Unparseable dates are mapped to None and flagged.
    """
    if df.empty:
        return df.copy()

    cleaned_df = df.copy()
    for col in date_cols:
        if col not in cleaned_df.columns:
            continue
            
        parsed_dates = []
        for val in cleaned_df[col]:
            if val is None or pd.isna(val) or str(val).strip() == "":
                parsed_dates.append(None)
                continue
                
            val_str = str(val).strip()
            try:
                dt = pd.to_datetime(val_str, errors="coerce")
                if pd.notna(dt):
                    parsed_dates.append(dt.strftime("%Y-%m-%d"))
                else:
                    logger.warning(f"Unparseable date value '{val_str}' in column '{col}'.")
                    parsed_dates.append(None)
                    meta["missing_fields"][col] = meta["missing_fields"].get(col, 0) + 1
            except Exception as e:
                logger.warning(f"Exception parsing date '{val_str}' in column '{col}': {e}")
                parsed_dates.append(None)
                meta["missing_fields"][col] = meta["missing_fields"].get(col, 0) + 1

        cleaned_df[col] = parsed_dates
        
    return cleaned_df

def handle_nulls(
    df: pd.DataFrame,
    numeric_cols: List[str],
    text_cols: List[str],
    meta: Dict[str, Any]
) -> pd.DataFrame:
    """
    Validates and replaces null values.
    """
    if df.empty:
        return df.copy()

    cleaned_df = df.copy()
    
    # Process numeric fields
    for col in numeric_cols:
        if col not in cleaned_df.columns:
            continue
            
        # Count actual missing values before parsing
        missing_count = int(cleaned_df[col].isna().sum())
        if missing_count > 0:
            meta["missing_fields"][col] = meta["missing_fields"].get(col, 0) + missing_count
            
        def clean_numeric(val: Any) -> float:
            if val is None or pd.isna(val) or str(val).strip() == "":
                return 0.0
            val_str = str(val).strip().replace(",", "")
            val_str = val_str.replace("%", "")
            try:
                match = re.search(r"[-+]?\d*\.\d+|\d+", val_str)
                if match:
                    return float(match.group())
                return 0.0
            except ValueError:
                return 0.0
                
        cleaned_df[col] = cleaned_df[col].apply(clean_numeric)

    # Process text fields for missing count logging
    for col in text_cols:
        if col not in cleaned_df.columns:
            continue
            
        missing_count = int(cleaned_df[col].isna().sum())
        if missing_count > 0:
            meta["missing_fields"][col] = meta["missing_fields"].get(col, 0) + missing_count

    return cleaned_df

def clean_dataframe(
    items: List[Dict[str, Any]],
    expected_columns: Dict[str, str],
    numeric_cols: List[str],
    date_cols: List[str],
    text_cols: List[str]
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Runs the full flattening, deduplication, text & date normalization, and null handling pipeline.
    """
    # Identify which columns exist in the board schema (case-insensitive checks)
    all_titles = set()
    if items:
        for col in items[0].get("column_values", []):
            title = col.get("column", {}).get("title") if "column" in col else col.get("title")
            if title:
                all_titles.add(title.strip().lower())
                
    # Group expected columns by internal name
    from collections import defaultdict
    internal_to_titles = defaultdict(list)
    for title, field in expected_columns.items():
        internal_to_titles[field].append(title.strip().lower())
        
    missing_board_columns = []
    for field, titles in internal_to_titles.items():
        # If none of the titles/aliases for this field are present on the board
        if not any(t in all_titles for t in titles):
            missing_board_columns.append(field)

    meta = {
        "missing_fields": {},
        "dropped_rows": 0,
        "total_rows": len(items),
        "missing_board_columns": missing_board_columns
    }

    if not items:
        df = pd.DataFrame(columns=["id", "name"] + list(expected_columns.values()))
        return df, meta

    # Flatten and map columns
    df = raw_items_to_df(items, expected_columns)
    
    # Clean
    df = deduplicate(df, meta)
    df = normalize_text(df, text_cols, meta)
    df = normalize_dates(df, date_cols, meta)
    df = handle_nulls(df, numeric_cols, text_cols, meta)

    return df, meta
