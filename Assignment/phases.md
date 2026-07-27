# phases.md — Build Phases

Each phase should be completed and sanity-checked before moving to the next. An agent working through this repo should update `memory.md` after finishing each phase (or each file within a phase).

## Phase 0 — Planning (done)
- [x] PRD.md
- [x] Architecture.md
- [x] rules.md
- [x] phases.md
- [x] design.md
- [x] AGENTS.md
- [x] memory.md initialized

## Phase 1 — Backend Foundations
- `config.py` — env loading, `Settings` model (Monday token, OpenAI key, CORS origins, cache TTL)
- `models.py` — Pydantic models: `ChatRequest`, `ChatResponse`, `LeadershipSummaryResponse`, `BoardData`, `DealItem`, `WorkOrderItem`, error models
- `requirements.txt`
- `.env.example`
- **Exit criteria**: `config.py` loads settings from `.env` without error; models import cleanly with no circular deps.

## Phase 2 — Monday.com Integration
- `monday_client.py`: GraphQL queries for both boards, pagination via cursor, retry/backoff, `MondayAPIError`
- **Exit criteria**: `get_all_data()` returns both boards as list[dict] against a real token, or a mock mode returns realistic sample data when no token is set (for demo without live credentials).

## Phase 3 — Data Cleaning
- `data_cleaner.py`: `normalize_dates`, `normalize_text`, `handle_nulls`, `deduplicate`, `clean_dataframe`
- **Exit criteria**: feeding intentionally messy sample data (nulls, mixed date formats, duplicate rows, inconsistent casing) through `clean_dataframe()` produces a clean DataFrame with no exceptions and a `_meta` report of what was fixed/dropped.

## Phase 4 — Business Analytics
- `analytics.py`: `pipeline_health`, `sector_analysis`, `revenue_summary`, `delayed_work_orders`, `monthly_forecast`, `business_overview`, `leadership_summary`
- **Exit criteria**: each function returns a JSON-serializable dict; unit-testable independent of Monday/OpenAI (pure functions over DataFrames).

## Phase 5 — AI Layer
- `llm.py`: system prompts (analyst persona), `classify_intent()`, `generate_response()`, `generate_leadership_narrative()`
- **Exit criteria**: given a fixed structured summary and a sample question, GPT output includes Executive Summary/Insights/Risks/Recommendations and never introduces a number absent from the input summary (spot-check manually).

## Phase 6 — API Layer
- `app.py`: `GET /health`, `GET /boards`, `POST /chat`, `POST /leadership-summary`, CORS setup, exception handlers
- **Exit criteria**: all four endpoints respond correctly via `curl`/Swagger UI (`/docs`), including simulated Monday-down and OpenAI-down error paths.

## Phase 7 — Frontend Foundations
- Next.js 15 app scaffold, Tailwind + shadcn/ui setup, theme provider (dark mode), `types/index.ts`, `services/api.ts`
- **Exit criteria**: blank themed shell deploys locally, dark/light toggle works, typed API client compiles.

## Phase 8 — Chat UI
- `ChatWindow`, `MessageBubble`, `ChatInput`, `LoadingIndicator`, `ErrorBanner`, `ExamplePrompts`, `useChat` hook
- **Exit criteria**: full conversation loop works against the live backend — send question, see loading state, see formatted analyst answer, error banner shows on simulated backend failure.

## Phase 9 — Leadership Update UI
- `LeadershipUpdateCard`, `useLeadershipSummary` hook, entry point in header/nav
- **Exit criteria**: one click produces a readable structured leadership report matching the PRD's section list.

## Phase 10 — Polish & Resilience
- Responsive check (mobile widths), empty-state design, error-state design, ambiguous-question clarification flow tested end-to-end, loading skeletons
- **Exit criteria**: manual pass through the 9 example questions in the assignment brief, plus at least 2 deliberately ambiguous questions.

## Phase 11 — Documentation & Deployment
- `README.md` (setup, env vars, run, deploy, architecture diagram), `DecisionLog.md` (assumptions/tradeoffs/rationale)
- Deploy backend to Render, frontend to Vercel, verify CORS and env vars in production
- **Exit criteria**: a stranger can clone the repo, follow README, and get the app running locally and in production without asking a question.

## Phase 12 — Final Review Pass
- Re-read PRD against the shipped app — every functional requirement checked off
- Re-read rules.md — confirm no violations (raw data to GPT, hardcoded secrets, etc.)
- Update memory.md to reflect "complete" status
