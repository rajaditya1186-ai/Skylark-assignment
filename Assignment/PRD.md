# PRD.md — AI Business Intelligence Agent for Skylark Drones

## 1. Problem Statement

Skylark Drones runs its commercial operations through two Monday.com boards — **Deals** and **Work Orders**. Leadership needs fast, reliable answers to business questions ("How's pipeline this quarter?", "Which sector is most profitable?") without manually opening Monday, filtering views, and cross-referencing boards by hand.

This project builds an **AI Business Intelligence Agent**: a chat interface that fetches live data from Monday.com, cleans it, reasons over it with an LLM, and returns founder/leadership-grade answers — grounded strictly in real data, never hallucinated.

## 2. Target Users

| User | Need |
|---|---|
| **Founder / Leadership** | Quick, trustworthy answers on revenue, pipeline, delivery risk — without opening Monday.com |
| **Ops / Delivery Manager** | Identify delayed work orders, bottlenecks, resourcing gaps |
| **Sales Lead** | Pipeline health, sector performance, closure probability |
| **Assignment Evaluator** (Skylark hiring panel) | Judge engineering quality, data handling rigor, AI-integration discipline, and product thinking |

The primary design target is the **evaluator**, since this is a hiring assignment — every decision should visibly demonstrate correctness, resilience to messy data, and honest AI behavior over cleverness.

## 3. Core Value Proposition

> Ask a business question in plain English. Get a leadership-quality answer grounded in real Monday.com data — with clear caveats when data is missing or ambiguous, and never a fabricated number.

## 4. Functional Requirements

### 4.1 Data Layer
- Connect to Monday.com via GraphQL using a Personal API Token (from `.env`, never hardcoded).
- Fetch **Deals** and **Work Orders** boards in full, with pagination and retry on transient failures.
- Clean and normalize: missing values, inconsistent date formats, inconsistent text casing/labels (e.g. "Won"/"won"/"WON"), duplicate rows.
- Never crash on incomplete or malformed records — degrade gracefully and log what was skipped/imputed.

### 4.2 Conversational Q&A
- Accept free-text business questions.
- Route to the right analytics function(s) based on intent (pipeline, sector, work orders, revenue, forecast, comparison, summary).
- If a question is ambiguous, the agent **asks a clarifying question** instead of guessing (e.g. "Do you mean sales pipeline, work orders, or overall business health?").
- Maintain conversation history in the session so follow-ups ("what about last month?") retain context.

**Reference example questions** (used as the standard manual test set in `phases.md` and `AGENTS.md` — every one of these must produce a sensible, grounded answer before the app is considered done):
1. How is our pipeline looking this quarter?
2. Show mining sector performance.
3. Which work orders are delayed?
4. What revenue is expected this month?
5. Which deals have high closure probability?
6. Compare pipeline vs completed work.
7. Which sectors generate the highest revenue?
8. Summarize business health.
9. Prepare a leadership update.

### 4.3 Leadership Update
- One-click / one-command generation of a structured weekly leadership report:
  Revenue Pipeline · Open Deals · Completed Work Orders · Delayed Projects · Top Performing Sector · Highest Risk Area · Missing Data Summary · Key Recommendations.

### 4.4 AI Behavior Contract
- The backend **never** sends raw Monday rows to GPT. It sends a cleaned, aggregated, structured JSON summary.
- GPT is instructed to act as a business analyst: Executive Summary → Insights → Risks → Recommendations.
- GPT must **never invent numbers** — if data required to answer isn't present, it must say so explicitly rather than fabricate.
- All numeric claims in an AI answer must be traceable to a value computed in `analytics.py`, not synthesized by the LLM.

### 4.5 UI
- ChatGPT-style interface: message history, typing/loading indicator, error states, example prompt chips.
- Responsive layout, working dark mode.
- A visible way to trigger "Leadership Update" as a first-class action, not just a chat message.

## 5. Non-Functional Requirements
- **Resilience**: Monday API failure, OpenAI failure, or missing board must each produce a friendly, specific error — never a raw stack trace to the user.
- **Security**: no secrets in source, `.env.example` provided, CORS locked to the deployed frontend origin.
- **Performance**: Monday data cached in-memory per session/TTL to avoid refetching on every chat turn.
- **Transparency**: Every AI answer that references missing/incomplete data explicitly states so.

## 6. Out of Scope (v1)
- Writing back to Monday.com (read-only integration).
- Multi-tenant / multi-org support.
- User authentication (single internal-use deployment for the assignment demo).
- Historical trend storage beyond what Monday.com currently holds (no separate data warehouse).

## 7. Success Criteria (how this assignment is judged)
1. Runs end-to-end against a real Monday.com account with zero crashes on messy data.
2. Answers are demonstrably grounded — numbers in AI responses match `analytics.py` output.
3. Clarification behavior works on genuinely ambiguous questions.
4. Leadership Update reads like something a founder would actually forward to a board.
5. Code is clean, typed, documented, and the repo tells a coherent engineering story (PRD → Architecture → Phases → working code).
