"""
Monday.com API client.
Handles GraphQL operations, pagination, caching, retries, and provides mock data in mock mode.
"""
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from config import settings

logger = logging.getLogger(__name__)

class MondayAPIError(Exception):
    """
    Custom exception for Monday.com API failures.
    Includes an error type to classify the failure.
    """
    def __init__(self, message: str, error_type: str = "MondayAPIError"):
        super().__init__(message)
        self.message = message
        self.error_type = error_type

class MondayClient:
    """
    Client for interacting with the Monday.com GraphQL API.
    Implements retries, pagination, and a fallback mock mode.
    """
    
    def __init__(self) -> None:
        self.headers = {
            "Authorization": settings.monday_api_token,
            "Content-Type": "application/json",
            "API-Version": "2024-01"
        }
        self.api_url = "https://api.monday.com/v2/"

    async def _post_query(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a GraphQL query against Monday.com API with exponential backoff on transient errors.
        """
        if settings.is_monday_mock_mode:
            raise MondayAPIError("Attempted to connect to Monday.com in mock mode.", "MockModeError")

        retries = 3
        backoff = 1.0

        async with httpx.AsyncClient(timeout=15.0) as client:
            for attempt in range(retries):
                try:
                    response = await client.post(
                        self.api_url,
                        json={"query": query, "variables": variables},
                        headers=self.headers
                    )
                    
                    # Log rate limit warnings if header is present
                    reset_header = response.headers.get("x-ratelimit-reset")
                    if reset_header:
                        logger.debug(f"Monday API Rate Limit Reset in: {reset_header}s")

                    # Handle HTTP errors
                    if response.status_code >= 500:
                        if attempt == retries - 1:
                            raise MondayAPIError(f"Monday.com API returned server error: {response.status_code}", "ServerError")
                        logger.warning(f"Monday.com server error {response.status_code}. Retrying in {backoff}s...")
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue

                    if response.status_code in (401, 403):
                        raise MondayAPIError("Unauthorized: Monday.com API token is invalid or missing permissions.", "AuthError")

                    if response.status_code != 200:
                        raise MondayAPIError(f"Monday.com API query failed with status code {response.status_code}", "HTTPError")

                    res_json = response.json()
                    
                    # Handle GraphQL specific errors
                    if "errors" in res_json:
                        graphql_err = res_json["errors"][0].get("message", "Unknown GraphQL error")
                        raise MondayAPIError(f"Monday.com GraphQL error: {graphql_err}", "GraphQLError")

                    return res_json.get("data", {})

                except httpx.RequestError as exc:
                    if attempt == retries - 1:
                        raise MondayAPIError(f"Monday.com connection failed: {str(exc)}", "ConnectionError")
                    logger.warning(f"Connection issue: {exc}. Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2

        raise MondayAPIError("Monday.com query failed after maximum retries.", "RetriesExceededError")

    async def _resolve_board_id_by_name(self, name_pattern: str) -> str:
        """
        Dynamically finds a Monday board ID matching the given name pattern.
        Avoids hardcoding board IDs.
        """
        query = """
        query {
          boards (limit: 50) {
            id
            name
          }
        }
        """
        try:
            data = await self._post_query(query)
            boards = data.get("boards", [])
            for b in boards:
                if "subitems" in b["name"].lower():
                    continue
                if name_pattern.lower() in b["name"].lower():
                    logger.info(f"Resolved board '{b['name']}' to ID: {b['id']}")
                    return b["id"]
            
            raise MondayAPIError(
                f"Could not find a board named '{name_pattern}'. Please make sure it is named correctly in Monday.com.",
                "BoardNotFoundError"
            )
        except MondayAPIError as e:
            raise e
        except Exception as e:
            raise MondayAPIError(f"Failed to resolve board ID for pattern '{name_pattern}': {str(e)}", "UnexpectedError")

    async def _fetch_board_items(self, board_id: str) -> List[Dict[str, Any]]:
        """
        Fetches all items for a board using modern GraphQL items_page pagination cursor.
        """
        items = []
        limit = 100
        cursor = None

        while True:
            if not cursor:
                query = """
                query ($board_id: [ID!]!, $limit: Int!) {
                  boards (ids: $board_id) {
                    items_page (limit: $limit) {
                      cursor
                      items {
                        id
                        name
                        column_values {
                          id
                          column {
                            title
                          }
                          text
                          value
                        }
                      }
                    }
                  }
                }
                """
                variables = {"board_id": [board_id], "limit": limit}
            else:
                query = """
                query ($limit: Int!, $cursor: String!) {
                  next_items_page (limit: $limit, cursor: $cursor) {
                    cursor
                    items {
                      id
                      name
                      column_values {
                        id
                        column {
                          title
                        }
                        text
                        value
                      }
                    }
                  }
                }
                """
                variables = {"limit": limit, "cursor": cursor}

            data = await self._post_query(query, variables)
            
            # Extract item page details
            if not cursor:
                boards_list = data.get("boards", [])
                items_page = boards_list[0].get("items_page", {}) if boards_list else {}
            else:
                items_page = data.get("next_items_page", {})

            page_items = items_page.get("items", [])
            
            # Map column { title } to title for compatibility with data_cleaner.py
            for item in page_items:
                col_vals = item.get("column_values", [])
                for col in col_vals:
                    if "column" in col and isinstance(col["column"], dict):
                        col["title"] = col["column"].get("title")
            
            items.extend(page_items)

            cursor = items_page.get("cursor")
            if not cursor or len(page_items) < limit:
                break

        return items

    async def get_deals(self) -> List[Dict[str, Any]]:
        """
        Fetches Deals board raw items.
        Falls back to generating mock data if setting is in mock mode.
        """
        if settings.is_monday_mock_mode:
            logger.info("Monday client: mock mode is active. Returning mock Deals.")
            return self._generate_mock_deals()

        try:
            board_id = settings.deals_board_id.strip()
            if not board_id:
                board_id = await self._resolve_board_id_by_name("deals")
            return await self._fetch_board_items(board_id)
        except MondayAPIError as e:
            raise e
        except Exception as e:
            raise MondayAPIError(f"Unexpected error getting Deals board: {str(e)}", "UnexpectedError")

    async def get_work_orders(self) -> List[Dict[str, Any]]:
        """
        Fetches Work Orders board raw items.
        Falls back to generating mock data if setting is in mock mode.
        """
        if settings.is_monday_mock_mode:
            logger.info("Monday client: mock mode is active. Returning mock Work Orders.")
            return self._generate_mock_work_orders()

        try:
            board_id = settings.work_orders_board_id.strip()
            if not board_id:
                board_id = await self._resolve_board_id_by_name("work order")
            return await self._fetch_board_items(board_id)
        except MondayAPIError as e:
            raise e
        except Exception as e:
            raise MondayAPIError(f"Unexpected error getting Work Orders board: {str(e)}", "UnexpectedError")

    async def get_all_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetches deals and work orders boards concurrently.
        """
        deals_task = self.get_deals()
        work_orders_task = self.get_work_orders()
        
        deals, work_orders = await asyncio.gather(deals_task, work_orders_task)
        
        return {
            "deals": deals,
            "work_orders": work_orders
        }

    # --- Mock Data Generation ---

    def _make_mock_item(self, item_id: str, name: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Generates a dictionary matching the Monday.com GraphQL item response structure."""
        column_values = []
        for idx, (title, value) in enumerate(fields.items()):
            col_id = f"col_{title.lower().replace(' ', '_')}"
            column_values.append({
                "id": col_id,
                "title": title,
                "text": str(value) if value is not None else "",
                "value": f'"{value}"' if value is not None else None
            })
        return {
            "id": item_id,
            "name": name,
            "column_values": column_values
        }

    def _generate_mock_deals(self) -> List[Dict[str, Any]]:
        """
        Generates rich, representative Deals mock data for fallback & testing.
        Includes messy entries, duplicates, and missing values to stress test cleaning.
        """
        raw_deals = [
            ("d1", "Tata Steel Exploration", {"Sector": "Mining", "Stage": "Won", "Value": "150000", "Probability": "100", "Expected Close Date": "2026-07-15", "Owner": "Alice"}),
            ("d2", "Adani Green Survey", {"Sector": "Energy", "Stage": "Won", "Value": "180000", "Probability": "100", "Expected Close Date": "2026-07-20", "Owner": "Alice"}),
            ("d3", "NHAI Road Mapping", {"Sector": "Infrastructure", "Stage": "Proposal", "Value": "250000", "Probability": "70", "Expected Close Date": "2026-08-10", "Owner": "Bob"}),
            ("d4", "Rio Tinto Mine Volumetrics", {"Sector": "Mining", "Stage": "Negotiation", "Value": "300000", "Probability": "80", "Expected Close Date": "2026-07-30", "Owner": "Bob"}),
            ("d5", "Reliance Agri Monitoring", {"Sector": "Agriculture", "Stage": "Lead", "Value": "50000", "Probability": "20", "Expected Close Date": "2026-09-01", "Owner": "Charlie"}),
            ("d6", "Jindal Steel Survey", {"Sector": "Mining", "Stage": "Proposal", "Value": "120000", "Probability": "50", "Expected Close Date": "2026-08-15", "Owner": "Alice"}),
            ("d7", "L&T Corridor Mapping", {"Sector": "Infrastructure", "Stage": "Won", "Value": "200000", "Probability": "100", "Expected Close Date": "2026-06-25", "Owner": "Charlie"}),
            # Duplicate item (exact copy of d1) to test deduplication
            ("d1", "Tata Steel Exploration", {"Sector": "Mining", "Stage": "Won", "Value": "150000", "Probability": "100", "Expected Close Date": "2026-07-15", "Owner": "Alice"}),
            # Inconsistent casing, spacing, and date formatting to test parser
            ("d9", "Messy Deal", {"Sector": "mining", "Stage": "won", "Value": " 150000 ", "Probability": "100%", "Expected Close Date": "15/07/2026", "Owner": "Alice"}),
            # Missing data (null values) to test error paths and missing data disclosure
            ("d10", "Missing Fields Deal", {"Sector": None, "Stage": "Proposal", "Value": None, "Probability": None, "Expected Close Date": None, "Owner": "Bob"})
        ]
        return [self._make_mock_item(did, name, fields) for did, name, fields in raw_deals]

    def _generate_mock_work_orders(self) -> List[Dict[str, Any]]:
        """
        Generates realistic Work Orders mock data.
        Includes a delayed item (status In Progress, but due date 2026-07-25 is before current date 2026-07-27).
        """
        raw_work_orders = [
            ("w1", "Tata Steel Volumetrics WO", {"Status": "Completed", "Start Date": "2026-06-01", "Due Date": "2026-06-20", "Sector": "Mining", "Assigned To": "Dave"}),
            ("w2", "Adani Solar Inspection WO", {"Status": "In Progress", "Start Date": "2026-06-15", "Due Date": "2026-07-25", "Sector": "Energy", "Assigned To": "Eve"}), # Delayed
            ("w3", "NHAI Expressway Survey WO", {"Status": "Delayed", "Start Date": "2026-07-01", "Due Date": "2026-08-01", "Sector": "Infrastructure", "Assigned To": "Dave"}),
            ("w4", "Reliance Crop Health WO", {"Status": "Not Started", "Start Date": "2026-07-20", "Due Date": "2026-08-10", "Sector": "Agriculture", "Assigned To": "Eve"}),
            ("w5", "L&T Infrastructure Mapping WO", {"Status": "Completed", "Start Date": "2026-05-10", "Due Date": "2026-06-15", "Sector": "Infrastructure", "Assigned To": "Frank"}),
            # Inconsistent formatting
            ("w6", "Messy Work Order", {"Status": "IN PROGRESS", "Start Date": "2026/06/15", "Due Date": "25-07-2026", "Sector": "energy", "Assigned To": "Eve"})
        ]
        return [self._make_mock_item(wid, name, fields) for wid, name, fields in raw_work_orders]
