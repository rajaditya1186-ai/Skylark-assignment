# Architecture.md — AI Business Intelligence Agent

## 1. High-Level Flow

```
┌─────────────┐      question       ┌──────────────┐
│   Frontend  │ ──────────────────► │   FastAPI    │
│  (Next.js)  │ ◄────────────────── │   Backend    │
└─────────────┘      answer         └──────┬───────┘
                                            │
                     ┌──────────────────────┼───────────────────────┐
                     ▼                      ▼                       ▼
             ┌───────────────┐     ┌────────────────┐      ┌────────────────┐
             │ MondayClient  │     │  DataCleaner    │      │   Analytics     │
             │ (GraphQL API) │────►│ (normalize/     │─────►│ (pipeline,      │
             │ Deals + WOs   │     │  dedupe/nulls)  │      │  sector, risk…) │
             └───────────────┘     └────────────────┘      └────────┬────────┘
                                                                     │
                                                          structured summary JSON
                                                                     │
                                                                     ▼
                                                             ┌────────────────┐
                                                             │  llm.py (GPT)  │
                                                             │ analyst prompt │
                                                             └────────────────┘
```

**Golden rule**: raw Monday rows never cross the boundary into `llm.py`. Only `analytics.py` output (aggregated, typed, already-truthful) is passed to GPT.

## 2. Request Lifecycle (`POST /chat`)

1. Frontend sends `{ message, conversation_id }`.
2. Backend fetches Deals + Work Orders via `MondayClient.get_all_data()` (cached with TTL; refetched if stale).
3. `data_cleaner.clean_dataframe()` runs on both boards.
4. `llm.classify_intent()` — a lightweight GPT call (or rule-based first pass) determines: is this ambiguous? which analytics function(s) apply?
5. If ambiguous → return a clarification question immediately, no analytics run.
6. If clear → relevant `analytics.py` functions execute, producing a structured JSON summary (numbers, sector breakdowns, delayed items, missing-data notes).
7. `llm.generate_response()` sends `{ user_question, structured_summary }` to GPT with the analyst system prompt.
8. Response returned to frontend with: answer text, data-completeness flag, and (optionally) the raw structured summary for a "view data" expandable section.

## 3. Leadership Update Lifecycle (`POST /leadership-summary`)

Same pipeline as above, but skips intent classification and directly runs `leadership_summary()`, which internally composes `pipeline_health()`, `sector_analysis()`, `revenue_summary()`, `delayed_work_orders()`. Result is passed to GPT with a report-style prompt (not conversational).

## 4. Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | Server components for fast initial load, easy Vercel deploy |
| Language | TypeScript | Type safety across API boundary via shared types |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components; easy dark mode |
| Backend framework | FastAPI | Async-native, Pydantic validation, auto OpenAPI docs |
| Data handling | pandas | Battle-tested cleaning/aggregation on tabular Monday exports |
| HTTP client | httpx (async) | Async GraphQL calls to Monday with retry/backoff |
| Validation | pydantic | Strict schemas for API payloads and internal data models |
| LLM | OpenAI GPT API | Per assignment spec; structured-summary-in, analyst-answer-out |
| Config | python-dotenv | Standard `.env` handling, no secrets in code |
| Backend deploy | Render | Simple env-var based deploy, good for FastAPI |
| Frontend deploy | Vercel | Native Next.js hosting |

## 5. Folder & File Structure

```
business-intelligence-agent/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                # Chat page (main entry)
│   │   ├── layout.tsx              # Root layout, theme provider
│   │   └── globals.css
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ExamplePrompts.tsx
│   │   │   ├── LoadingIndicator.tsx
│   │   │   └── ErrorBanner.tsx
│   │   ├── leadership/
│   │   │   └── LeadershipUpdateCard.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── ui/                     # shadcn/ui generated primitives
│   ├── hooks/
│   │   ├── useChat.ts
│   │   └── useLeadershipSummary.ts
│   ├── services/
│   │   └── api.ts                  # typed fetch wrappers to backend
│   ├── types/
│   │   └── index.ts                # ChatMessage, LeadershipSummary, ApiError, etc.
│   ├── .env.local.example
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/
│   ├── app.py                      # FastAPI app, routes, CORS, startup
│   ├── monday_client.py            # MondayClient class (GraphQL, pagination, retry)
│   ├── data_cleaner.py             # normalize_dates, normalize_text, handle_nulls, deduplicate, clean_dataframe
│   ├── analytics.py                # pipeline_health, sector_analysis, revenue_summary, delayed_work_orders, monthly_forecast, business_overview, leadership_summary
│   ├── llm.py                      # prompt templates, classify_intent, generate_response, generate_leadership_narrative
│   ├── models.py                   # Pydantic request/response + internal data models
│   ├── config.py                   # Settings via pydantic-settings / dotenv
│   ├── requirements.txt
│   └── .env.example
│
├── PRD.md
├── Architecture.md
├── rules.md
├── phases.md
├── design.md
├── memory.md
├── AGENTS.md
├── README.md
└── DecisionLog.md
```

## 6. Backend Module Contracts

- **`monday_client.py`**
  - `MondayClient.get_deals() -> list[dict]`
  - `MondayClient.get_work_orders() -> list[dict]`
  - `MondayClient.get_all_data() -> dict[str, list[dict]]`
  - Internally: paginated GraphQL queries (`items_page` cursor), exponential-backoff retry (max 3 attempts), typed error surfaced as `MondayAPIError`.

- **`data_cleaner.py`**
  - Pure functions, no side effects, operate on and return pandas DataFrames.
  - `clean_dataframe()` is the single composed entry point calling the other four in order: nulls → text → dates → dedupe.

- **`analytics.py`**
  - Each function takes cleaned DataFrame(s) and returns a plain-dict JSON-serializable summary — this is the *only* thing allowed to reach `llm.py`.

- **`llm.py`**
  - Owns all prompt construction. No analytics logic here — it only formats data + calls OpenAI + parses response.
  - Three responsibilities: `classify_intent()` (routes/detects ambiguity), `generate_response()` (conversational Q&A), `generate_leadership_narrative()` (report-style prompt for the Leadership Update).

## 7. State & Caching
- Monday data is fetched once per backend process start and cached in-memory with a TTL (default 5 min) to avoid hammering the API on every chat message. A manual `/boards?refresh=true` bypass is supported.
- Conversation history is kept in-memory, keyed by `conversation_id`, as a simple list of `{role, content}` turns capped at the last N turns (e.g. 10) to bound prompt size. It is ephemeral — lost on backend restart — consistent with the "no database" scope decision; the frontend is responsible for holding the `conversation_id` for the session and resending it on each `/chat` call.
- No database in v1 — this is intentionally stateless beyond in-memory cache, per assignment scope.

## 8. Error Boundaries
- `MondayAPIError` → HTTP 502 with a message like "Couldn't reach Monday.com — please check the board connection."
- `OpenAIError` → HTTP 503 with a graceful fallback: return the raw structured summary with a note that AI narration is temporarily unavailable.
- Missing/renamed board → HTTP 422 explaining which board/column was expected vs found.
