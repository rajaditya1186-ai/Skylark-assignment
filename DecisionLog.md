# Decision Log — AI Business Intelligence Agent

This document outlines the major architectural choices, technical assumptions, and engineering tradeoffs made during the development of the Skylark BI Agent.

---

## 1. Dynamic Column Title Mapping vs Hardcoded Column IDs

### Context
Monday.com assigns random, non-descriptive hashes (e.g. `text4`, `numeric_1`) as column IDs. Hardcoding these IDs in the GraphQL client makes the backend highly fragile — if the columns are recreated or reordered, the application crashes.

### Decision
The data layer resolves columns by their **Title** (e.g. "Value", "Stage", "Due Date") rather than ID.
- In `monday_client.py`, the raw item query retrieves the display `title` and `text` for all column values.
- In `data_cleaner.py`, `raw_items_to_df` maps these title strings to standardized, lowercase snake_case variables (e.g., "Expected Close Date" -> `expected_close_date`).

### Tradeoffs
- **Pros**: Resilience. If a user moves columns around, or if a minor schema variance occurs, the code continues to function as long as column names remain constant.
- **Cons**: Minor overhead. The backend must inspect the column titles list on every clean operation, but this takes less than 1ms in pandas.

---

## 2. Model Selection: GPT-4o vs GPT-4o-mini

### Decision
- **Intent Classification & Ambiguity Detection**: `gpt-4o-mini` is used.
- **Analyst Q&A and Leadership Update Narratives**: `gpt-4o` is used.

### Rationale
- `gpt-4o-mini` has extremely low latency and costs ~10x less than `gpt-4o`. For quick routing decisions and JSON formatting, its reasoning capabilities are more than sufficient.
- `gpt-4o` excels at advanced text structuring, business insights extraction, and strict adherence to negative constraints (e.g. "never invent numbers"). It provides founder-grade analyst writeups that feel written by a professional, meeting the PRD tone requirements.

---

## 3. In-Memory Cache with TTL vs Persistent Database

### Context
Monday.com API has strict rate limits. Querying raw items on every single chat turn creates significant overhead and latency.

### Decision
We implemented a lightweight `MondayDataCache` in `app.py` with a 5-minute Time-To-Live (TTL). A manual refresh bypass is available via the `/boards?refresh=true` query parameter.

### Tradeoffs
- **Pros**: Immediate performance. Subsequent chat turns respond in under 50ms, with zero database setup or migration overhead.
- **Cons**: Lack of persistence across restarts. Since this is an internal assessment tool for a hiring evaluation, statelessness is a reasonable simplification that keeps the footprint light.

---

## 4. enforce Purity in Data Cleaner

### Context
Data cleaning is often messy, and debugging in-place dataframe mutations can lead to race conditions or silent bugs.

### Decision
All functions in `data_cleaner.py` (`deduplicate`, `normalize_text`, `normalize_dates`, `handle_nulls`) are **pure**. They explicitly copy the dataframe (`df.copy()`), apply operations, and return the modified copy alongside a validation report `meta`.

### Rationale
Enforcing functional purity guarantees that raw fetched records are never accidentally modified, keeping audit boundaries clear. It also facilitates clean unit testing of the sanitizer without state leaking.

---

## 5. Graceful Degradation: OpenAI Fallbacks

### Context
Commercial LLM APIs occasionally fail due to rate limits, network outages, or depleted billing balances.

### Decision
If OpenAI calls return a 429 or 503 error, the backend catches `OpenAIAPIError` and returns:
1. A friendly alert message: `"AI Narration is temporarily unavailable. Please refer directly to the structured analytics details below."`
2. The complete, computed JSON analytics object from `analytics.py`.
The frontend renders this data inside an expandable visual details panel, ensuring that leadership retains access to calculations even if OpenAI goes down.
