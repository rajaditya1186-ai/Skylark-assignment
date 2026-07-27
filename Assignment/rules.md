# rules.md — Engineering & AI Behavior Rules

These are binding constraints for anyone (human or AI agent) writing code in this repo. If a proposed change violates one of these, stop and flag it rather than proceeding silently.

## 1. Libraries — Use / Avoid

### Backend
| Use | Avoid | Why |
|---|---|---|
| `httpx.AsyncClient` | `requests` | Project is async end-to-end; `requests` is blocking and breaks FastAPI concurrency |
| `pydantic` v2 models for every API boundary | raw `dict` payloads | Type safety, auto-validation, self-documenting API |
| `pandas` for cleaning/aggregation | manual loops over lists of dicts for tabular ops | Correctness and readability for group-bys, date parsing |
| `python-dotenv` / `pydantic-settings` for config | `os.environ` scattered across files | Single source of truth for config, easy to audit |
| `openai` official SDK | raw `httpx` calls to OpenAI | Handles retries, streaming, error types correctly |
| `logging` module | `print()` | Structured, leveled logs needed for debugging Monday/OpenAI failures |

### Frontend
| Use | Avoid | Why |
|---|---|---|
| `shadcn/ui` primitives | ad-hoc custom components for buttons/inputs/cards | Consistency, accessibility, faster build |
| Server Components for static shell, Client Components for chat state | making everything `"use client"` | Performance; only interactive pieces need client JS |
| `fetch` via a typed `services/api.ts` wrapper | inline `fetch` calls scattered in components | Single place to handle errors/timeouts/base URL |
| Tailwind utility classes | inline `style={{}}` objects | Consistency with design system, dark-mode variants |

## 2. Data Handling Rules
- **Never read local CSV/Excel files.** All data must come from live Monday.com GraphQL calls. This is a hard assignment constraint, not a style preference.
- **Never send raw Monday rows to GPT.** Only `analytics.py` output (cleaned, aggregated, JSON-serializable) may be passed to `llm.py`.
- Every cleaning function must be **pure** (no mutation of input DataFrame in place unless explicitly named `_inplace`) and must **never raise on bad input** — malformed rows are logged and excluded, not fatal.
- Any imputed or dropped data must be tracked and surfaced (e.g. `_meta.missing_fields`, `_meta.dropped_rows`) so the AI layer can mention it honestly.

## 3. AI Boundaries — Non-Negotiable
1. **No hallucinated numbers.** Every number in an AI response must originate from `analytics.py`. The system prompt must explicitly instruct GPT to only use provided figures and to say "data not available" rather than estimate.
2. **Ask, don't assume, on ambiguity.** If a question could map to more than one analytics function with materially different answers, the agent must ask a clarifying question instead of picking one.
3. **No silent scope creep.** The agent answers business questions about Deals/Work Orders data — it should not speculate about topics outside the provided data (e.g. it shouldn't invent market commentary not grounded in the boards).
4. **Missing data must be named.** If a computation relies on fields that are null/missing for a meaningful fraction of rows, the response must disclose this, not just quietly compute over available rows.
5. **Every response should read like a business analyst, not a database dump** — Executive Summary → Insights → Risks → Recommendations — but the numbers inside must be traceable.

## 4. Error Handling Rules
- Every external call (Monday GraphQL, OpenAI) is wrapped in try/except with a **specific, typed exception** (`MondayAPIError`, `OpenAIError`), never a bare `except Exception: pass`.
- User-facing errors are always friendly and specific ("Couldn't reach Monday.com right now — please retry in a moment") — never a raw traceback or raw exception string reaches the frontend.
- Retries: Monday API calls retry up to 3x with exponential backoff on 5xx/timeout; do not retry on 4xx (bad token/query — fail fast with a clear message).
- If a board or expected column is missing, respond with exactly which board/column was expected — don't just say "error."

## 5. Security Rules
- No API keys, tokens, or secrets ever committed to source or hardcoded in code — `.env` only, `.env.example` documents required keys with placeholder values.
- CORS on the backend restricted to the deployed frontend origin (and `localhost` for dev), not `*`.
- Do not log full API tokens, even at DEBUG level.

## 6. Code Quality Rules
- Type hints on all Python function signatures.
- Every module has a short docstring explaining its responsibility.
- No function should do more than one of: fetch, clean, analyze, or prompt. Keep the pipeline stages separated (this is what makes the "no raw data to GPT" rule enforceable and auditable).
- Frontend components should be small and composable; a component doing data-fetching AND rendering AND state management is a sign to split it.

## 7. What NOT to build (scope discipline)
- No write-back to Monday.com.
- No user auth/login system.
- No database/persistence layer beyond in-memory caching.
- No multi-language support.
- Don't over-engineer the intent classifier — a small GPT call or clear rule-based keyword routing is sufficient; this isn't the place to build a custom NLU model.
