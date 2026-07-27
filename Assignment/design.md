# design.md — Visual Design System

Design intent: a **calm, analyst-grade dashboard/chat hybrid** — not a playful consumer chatbot. Think "internal tool a founder trusts," closer to Linear/Vercel dashboard aesthetics than a generic AI chatbot template.

## 1. Theme Philosophy
- Neutral, low-saturation base with a single confident accent color.
- Dark mode is the primary/default experience (ops and leadership tools are often used in dashboards/late hours); light mode fully supported.
- Data-forward: charts/numbers should never fight with UI chrome for attention.

## 2. Color Palette

### Dark mode (default)
| Token | Hex | Usage |
|---|---|---|
| `background` | `#0B0E14` | App background |
| `surface` | `#12161F` | Cards, chat bubbles (assistant), sidebar |
| `surface-elevated` | `#1A1F2B` | Modals, dropdowns |
| `border` | `#232837` | Dividers, card borders |
| `foreground` | `#E6E9F0` | Primary text |
| `muted-foreground` | `#8B93A7` | Secondary text, timestamps |
| `accent` (primary) | `#5B8DEF` | Primary buttons, links, active states, user message bubble |
| `accent-foreground` | `#0B0E14` | Text on accent surfaces |
| `success` | `#3FBE7A` | Healthy pipeline, on-time work orders |
| `warning` | `#E8A93B` | At-risk items, missing-data notices |
| `destructive` | `#E5584F` | Delayed work orders, errors |

### Light mode
| Token | Hex | Usage |
|---|---|---|
| `background` | `#FFFFFF` | App background |
| `surface` | `#F5F7FA` | Cards, assistant bubbles |
| `border` | `#E2E6ED` | Dividers |
| `foreground` | `#12161F` | Primary text |
| `muted-foreground` | `#5C6478` | Secondary text |
| `accent` | `#3E6FD9` | Primary actions |
| `success` | `#1F9D5C` | |
| `warning` | `#C5860E` | |
| `destructive` | `#D33A31` | |

> Implement via Tailwind CSS variables (`--background`, `--foreground`, etc.) and shadcn/ui's theme convention so `dark:` variants and the theme toggle work without duplicating component code.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| UI / body | **Inter** | Variable font, excellent at small sizes, standard for dashboard UIs |
| Numbers / data-heavy stats | **Inter (tabular-nums)** | Use `font-variant-numeric: tabular-nums` on any figures so columns of numbers align |
| Headings (leadership report) | **Inter, semi-bold/bold** | Keep one typeface family — avoid mixing a display font in; this isn't a marketing site |
| Monospace (raw data/debug view) | **JetBrains Mono** | Optional, only for an expandable "view structured data" panel |

**Scale** (Tailwind default scale, used consistently):
- `text-xs` (12px) — timestamps, meta labels
- `text-sm` (14px) — body/chat text, form inputs
- `text-base` (16px) — primary chat message text
- `text-lg` / `text-xl` — section headers within leadership report
- `text-2xl` / `text-3xl` — page title / report title only

Font weights: `font-normal` for body, `font-medium` for labels/buttons, `font-semibold` for headings — avoid `font-bold` except report titles, to keep the tone measured rather than shouty.

## 4. Layout & Spacing
- Base spacing unit: 4px (Tailwind default). Cards use `p-4`/`p-6`. Chat message gap: `gap-4`.
- Max content width for chat column: `max-w-3xl`, centered — mirrors familiar chat-app reading width.
- Leadership Update renders as a card grid (`grid-cols-1 md:grid-cols-2`) of metric tiles above the narrative summary, so numbers are scannable before reading prose.
- Border radius: `rounded-xl` (12px) on cards/bubbles — soft but not bubbly; `rounded-full` only for avatars/pills.

## 5. Component Notes
- **User message bubble**: accent background, right-aligned, `accent-foreground` text.
- **Assistant message bubble**: `surface` background, left-aligned, structured with clear sub-headers (Executive Summary / Insights / Risks / Recommendations) rendered as small bold labels, not full `<h2>`s, to keep chat rhythm.
- **Example prompt chips**: `border` outline, `muted-foreground` text, fill with `accent`/10% tint on hover.
- **Loading indicator**: three-dot pulse in `muted-foreground`, not a spinner — feels calmer, consistent with analyst-tool tone.
- **Error banner**: `destructive`/10% background tint, `destructive` left border, icon + short message, never a raw stack trace.
- **Missing-data badge**: small `warning`-tinted pill inline in assistant messages when disclosing incomplete data, e.g. "⚠ 4 deals missing close date."

## 6. Iconography
- **lucide-react** (already available, pairs with shadcn/ui) — outline style, 18–20px in UI chrome, consistent stroke width. No filled/emoji icons except the single ⚠ used sparingly for missing-data callouts.

## 7. Dark Mode Implementation Note
- Implement via `next-themes` + Tailwind `dark:` class strategy (not `prefers-color-scheme` only) so the toggle in the header is authoritative and persists per session.
