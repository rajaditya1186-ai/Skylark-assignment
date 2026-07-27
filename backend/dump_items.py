"""
Diagnostic script to inspect raw Monday.com item data.
"""
import asyncio
import httpx
import json
from config import settings

async def main():
    headers = {
        "Authorization": settings.monday_api_token,
        "Content-Type": "application/json",
        "API-Version": "2024-01"
    }
    
    query = """
    query ($board_ids: [ID!]!) {
      boards (ids: $board_ids) {
        id
        name
        items_page (limit: 3) {
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
    
    variables = {
        "board_ids": [settings.deals_board_id, settings.work_orders_board_id]
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            "https://api.monday.com/v2/",
            json={"query": query, "variables": variables},
            headers=headers
        )
        
        data = res.json()
        boards = data.get("data", {}).get("boards", [])
        for board in boards:
            print(f"\n==========================================")
            print(f"Board: {board['name']} (ID: {board['id']})")
            print(f"==========================================")
            items = board.get("items_page", {}).get("items", [])
            for item in items:
                print(f"\nItem: '{item['name']}' (ID: '{item['id']}')")
                for col in item.get("column_values", []):
                    title = col.get("column", {}).get("title")
                    print(f"  - Title: '{title}', ID: '{col['id']}', Text: '{col['text']}', Value: {col['value']}")

if __name__ == "__main__":
    asyncio.run(main())
