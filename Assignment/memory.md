# memory.md — Build Progress Tracker

> This file is the single source of truth for "what's done" and "what's in progress." Update it immediately after finishing or starting work on any file — don't batch updates. Any agent (or human) resuming work should be able to read only this file and know exactly where to pick up.

**Last updated:** 2026-07-27
**Current phase:** Phase 12 — Final Review Pass

---

## Status Legend
`[ ]` not started · `[~]` in progress · `[x]` complete · `[!]` blocked

## Planning Docs
- [x] PRD.md
- [x] Architecture.md
- [x] rules.md
- [x] phases.md
- [x] design.md
- [x] AGENTS.md
- [x] memory.md — initialized and cross-checked against all other planning docs

## Backend
- [x] config.py
- [x] models.py
- [x] requirements.txt
- [x] .env.example
- [x] monday_client.py
- [x] data_cleaner.py
- [x] analytics.py
- [x] llm.py
- [x] app.py

## Frontend
- [x] Next.js scaffold + Tailwind + shadcn/ui + next-themes
- [x] .env.local.example
- [x] types/index.ts
- [x] services/api.ts
- [x] hooks/useChat.ts
- [x] hooks/useLeadershipSummary.ts
- [x] components/chat/* (ChatWindow, MessageBubble, ChatInput, LoadingIndicator, ErrorBanner, ExamplePrompts)
- [x] components/leadership/LeadershipUpdateCard.tsx
- [x] components/layout/* (Header, ThemeToggle)
- [x] app/page.tsx, app/layout.tsx, globals.css

## Docs & Deployment
- [x] README.md
- [x] DecisionLog.md
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Production env vars verified, CORS verified

---

## Currently Being Worked On
**Phase 12 — Final Review Pass**: Validating final builds, checking against rules, and preparing documentation. Ready for deployment and review.

## Notes / Decisions Made So Far
- Assumed Monday.com column schema will be documented and mapped by column *title* (not hardcoded column ID) so it tolerates minor board differences — see DecisionLog.md once written.
- Dark mode is the default theme per design.md.
- No database — in-memory TTL cache only, per PRD scope.
- Mock/demo mode planned for `monday_client.py` so app still runs meaningfully without a live token during evaluation, if needed — confirm this is acceptable before relying on it as a fallback.

## Known Open Questions (resolve before Phase 2)
- Exact real column names for Deals board (Sector, Stage, Value, Probability, Expected Close Date, Owner — assumed).
- Exact real column names for Work Orders board (Status, Start Date, Due Date, Sector, Assigned To — assumed).
- Whether OpenAI model should be `gpt-4o` / `gpt-4o-mini` — pick based on cost/latency tradeoff, document choice in DecisionLog.md.
