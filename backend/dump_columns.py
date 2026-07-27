"""
Diagnostic script to inspect Monday.com board column structures.
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
        columns {
          id
          title
          type
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
        
        print("Status code:", res.status_code)
        data = res.json()
        
        if "errors" in data:
            print("Errors:", data["errors"])
            return
            
        boards = data.get("data", {}).get("boards", [])
        for board in boards:
            print(f"\n==========================================")
            print(f"Board: {board['name']} (ID: {board['id']})")
            print(f"==========================================")
            for col in board.get("columns", []):
                print(f"- Column ID: '{col['id']}', Title: '{col['title']}', Type: '{col['type']}'")

if __name__ == "__main__":
    asyncio.run(main())
