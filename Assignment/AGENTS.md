# AGENTS.md

This file is read by any coding agent (agentic CLI, Claude Code, Cursor, etc.) working in this repository. Follow it exactly. It is the operating contract for how this project gets built — read the referenced docs before writing code, not just this file in isolation.

## 0. Read Order (do this before writing any code)
1. `PRD.md` — what we're building and for whom
2. `Architecture.md` — how it's built, folder structure, data flow
3. `rules.md` — hard constraints, especially the AI-boundary and data-boundary rules
4. `phases.md` — the order to build things in
5. `design.md` — visual system, only needed once you reach frontend phases
6. `memory.md` — **check this first every session** to know what's already done and what's in progress

Do not skip to `phases.md` without reading `rules.md` — several rules (no raw data to GPT, never read local CSV/Excel, no hardcoded secrets) are load-bearing constraints that change how you write even the first file.

## 1. Session Protocol
At the **start** of every working session:
- Open `memory.md`. Identify the current phase and the "Currently Being Worked On" section.
- If resuming mid-file, re-read that file before editing it.

At the **end** of every working session, or after completing any file:
- Update `memory.md`: mark the file `[x]`, update "Currently Being Worked On," add any new decisions/open questions surfaced while building.
- Never leave `memory.md` stale — a stale memory file is treated as a bug.

## 2. Non-Negotiable Constraints (repeated here because they matter most)
- **Data source**: Live Monday.com GraphQL API only. Never read local CSV/Excel files, ever, even for testing — use a documented mock-mode inside `monday_client.py` if credentials are absent, never a file read.
- **AI boundary**: `llm.py` must never receive raw Monday rows — only `analytics.py` output. This is enforced structurally: `llm.py` should have no import of `monday_client.py`, only of `analytics.py`'s output types.
- **No hallucination**: the GPT system prompt must instruct "use only the provided figures; if data is missing, say so explicitly." Any number appearing in an AI response must be traceable to `analytics.py`.
- **Ambiguity → clarify**: if a question could plausibly map to multiple distinct analytics functions, return a clarifying question instead of guessing.
- **Secrets**: `.env` only, never hardcoded, `.env.example` always kept in sync with actually-used variables.
- **Graceful degradation**: no external-call failure (Monday, OpenAI) should ever surface a raw exception/stack trace to the user.

## 3. Build Order
Follow `phases.md` in order. Do not start frontend work before the backend's `/chat` and `/leadership-summary` endpoints are functional and manually testable via `/docs` (FastAPI's Swagger UI) — the frontend should be built against a real, working API, not a guessed contract.

Within backend phases, build in this dependency order (also reflected in `phases.md`):
`config.py` → `models.py` → `monday_client.py` → `data_cleaner.py` → `analytics.py` → `llm.py` → `app.py`

## 4. Definition of Done (per file)
A file is not "done" until:
1. It has type hints (Python) or proper TS types (frontend) — no `Any`/`any` unless genuinely unavoidable, and comment why if so.
2. It has a short module/component docstring or top comment describing its one responsibility.
3. It handles its own failure modes per `rules.md` (no bare excepts, no silent failures).
4. `memory.md` reflects it as complete.

## 5. When Uncertain
- **Board schema uncertainty** (real Monday column names unknown): use the assumed schema documented in `DecisionLog.md`, map by column *title* not column ID, and note the assumption inline in `monday_client.py` with a comment plus an entry in `memory.md`'s open questions.
- **Ambiguous instructions in PRD/Architecture**: prefer the interpretation that keeps data flow auditable (i.e., when in doubt, add a boundary/log rather than remove one).
- **Anything that would violate `rules.md`**: stop, do not proceed, surface the conflict rather than silently choosing a workaround.

## 6. Testing Expectations
- `analytics.py` functions should be manually verifiable with a small crafted sample DataFrame (nulls, duplicates, mixed formats) before wiring into the live API — correctness here is the core of the assignment's evaluation.
- Before considering Phase 6 (API layer) done, hit all four endpoints via `curl` or Swagger UI, including deliberately breaking Monday/OpenAI connectivity to confirm friendly error paths.
- Before considering the frontend done, manually run the 9 example questions from `PRD.md` plus at least 2 ambiguous questions end-to-end.

## 7. Final Deliverable Checklist (Phase 12)
- [ ] Every functional requirement in `PRD.md` is demonstrably working
- [ ] No rule in `rules.md` is violated anywhere in the codebase
- [ ] `README.md` lets a stranger run this locally and deploy it, unaided
- [ ] `DecisionLog.md` explains assumptions, tradeoffs, and rationale clearly enough for a reviewer to trust the engineering judgment behind the app
- [ ] `memory.md` shows 100% completion, no stale "in progress" markers

## 8. Tone for This Project
This is a hiring assignment. Every file should read like it was written by someone who understands both the engineering and the business stakes — precise, no dead code, no TODOs left unresolved, comments that explain *why* not just *what*. The Leadership Update output in particular is the single artifact most likely to be shown to an actual decision-maker at Skylark Drones — it should hold up to that scrutiny.
