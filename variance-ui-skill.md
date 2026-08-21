---
name: variance-ui
description: Use this skill whenever writing, editing, or reviewing any UI code in the Variance budgeting app — components, pages, Tailwind classes, chart theming, or anything touching color, type, or layout. Also use it whenever deciding how a new feature should look or behave in the UI (e.g. "should this be a modal or inline," "should this block the save action"), since it encodes both the visual system and this specific app's UX rules. Always check this skill before hardcoding a color, choosing a font weight, adding a dropdown, or building anything that could interrupt the Quick Entry flow.
---

# Variance UI Skill

Variance is a personal budgeting app built around one idea: logging money should take seconds, and understanding it should take one glance. This skill is the single source of truth for how the app looks and for the UX judgment calls that come up while building it. Read it before writing UI code, and re-check it whenever a design decision feels ambiguous.

## Brand identity

- **Name**: Variance
- **Tagline**: "Simple / Stable" — every UI decision should serve one of those two words. If a feature adds visual noise or asks the user to make a decision they didn't come to make, it's fighting the brand.
- **Wordmark font**: Inter Tight, bold, tracked normally for the primary logo lockup; "SIMPLE / STABLE" subtitle is Inter, weight 300, uppercase, letter-spaced.
- **Mark**: a simple line-drawn variance/candlestick-style squiggle (up-down-up motion) — evokes a stock chart line without being literal. Use sparingly as a loading indicator or empty-state flourish, never as decoration that competes with real data charts.

## Color tokens

Two complete palettes — light and dark — not just a single palette with a dark overlay. Implement both as CSS variables so every component just references the token name, never a raw hex value.

### Light mode
| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#1A3D2D` (Deep Forest Green) | Primary actions, headings, hero numbers (e.g. the balance figure) |
| `--color-secondary` | `#8C8E7C` (Sage Green) | Secondary UI, muted accents, chart secondary series |
| `--color-accent` | `#DAB059` (Gold Highlight) | Highlights, warnings-adjacent emphasis (not errors), goal-progress fill |
| `--color-text-primary` | `#1A1A1A`-range (Dark Slate Gray) | Body text |
| `--color-text-muted` | Muted Sage Gray (derive from Sage Green, desaturated/lightened) | Secondary text, labels, timestamps |
| `--color-surface` | off-white / warm paper tone (matches the style guide background) | App background |
| `--color-card` | white or near-white | Card surfaces |

### Dark mode
| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#A3C8B2` (Mint Green Accent) | Primary actions, headings, hero numbers |
| `--color-accent` | `#EDC97F` (Amber Gold Highlight) | Highlights, goal-progress fill |
| `--color-text-primary` | `#FFFFFF` (Crisp White) | Body text |
| `--color-text-muted` | `#A1A1A5` (Soft Gray) | Secondary text, labels, timestamps |
| `--color-surface` | near-black (matches the style guide's dark card background) | App background |
| `--color-card` | slightly lighter near-black | Card surfaces |

### Semantic tokens (define once, map differently per mode if needed)
- `--color-success` — confirmations, under-budget states, goal milestones. Lean on the primary green rather than a generic UI green.
- `--color-warn` — approaching a budget limit (≥80%, per `PLAN.md` FR-24). Use the accent gold, not red — budgets are passive/informational in v1, never alarming.
- `--color-over` — a budget limit exceeded. Still avoid harsh red; a deeper/desaturated warm tone that reads as "notice this" without feeling punitive fits the brand better than a stock error red. If you do need true red (destructive actions like Delete), keep it reserved for genuinely destructive, irreversible actions only — not for budget overages.

**Rule**: never hardcode a hex value in component code. Every color reference goes through a CSS variable / Tailwind theme token so light/dark mode is a variable swap, not a component rewrite.

## Typography

| Style | Font / Weight | Example usage |
|---|---|---|
| Heading 1 | Inter Tight, 700 | Page titles ("Welcome to Variance") |
| Heading 2 | Inter Tight, 600 | Section headers ("Monthly Spending") |
| Body | Inter, 400 | Standard copy, descriptions |
| Label | Inter, 300, uppercase, letter-spaced | Small metadata labels ("SIMPLE / STABLE" style tags, form field labels, category chip micro-labels) |

- Two font weights carry almost all the UI: Inter Tight for anything that needs to feel structural (headings, the balance number), Inter for everything else.
- Don't introduce a third typeface. Don't use bold body text for emphasis — reach for the accent color or a Label-style treatment instead.

## Component patterns from the reference cards

The style guide's own mobile card mockups are the reference implementation for the dashboard's hero balance:
- A rounded card, generous padding, with the balance figure as by far the largest text on the card (Heading 1 scale or larger).
- A small sparkline/trend line above or behind the balance number — this is the "Available now" treatment from `FEATURES_NEXT.md` §1. Use a simple line, not a full axis-labeled chart, at this size.
- Both light and dark versions of this card must look intentional, not like an inverted color filter — respect the token table above rather than just flipping black/white.

## App-specific UX rules (not generic style — decisions specific to Variance)

These resolve the "should this be built this way" questions that come up while implementing features, based on decisions already made for this app:

1. **Budgets are passive, always.** A budget/limit indicator (weekly total or per-category, per `PLAN.md` FR-24) is informational only. It never blocks, confirms, or interrupts a save action. If a feature idea would make a limit "stop" an entry, that's out of scope — flag it instead of building it.
2. **Quick Entry stays flat, never a wizard.** Amount → category → submit must stay reachable in one screen, no multi-step flow, no modal stack. Category selection uses **chips**, not a dropdown — dropdowns hide the options and cost an extra tap; chips show them at a glance and are one tap to select.
3. **Amount is never hidden behind a menu.** It's the first interactive element on Quick Entry, always visible, always the biggest input on the screen.
4. **Recurring transactions follow the Google Calendar mental model.** Three distinct actions, never conflated in the UI: Confirm (accept as-is), Dismiss/Snooze (skip just this occurrence, keep the rule), Deactivate/Delete the rule (cancel the whole series). Label these distinctly — never just one ambiguous "Delete" button on a recurring item.
5. **Unorganized is a real, visible bucket — not an error state.** When OCR can't confidently categorize a receipt, the UI should present "Unorganized" the same way it presents any other category chip (using `--color-text-muted` rather than a warning color), with a lightweight way to bulk re-categorize later. Don't style it like something went wrong.
6. **Motion is subtle and respects `prefers-reduced-motion`.** Save confirmations and progress-bar fills get a brief transition, never a bouncy/attention-grabbing animation — "Simple / Stable" applies to motion too.

## Files to respect

When implementing against this skill in the actual codebase:
- `lib/categories.ts` (or equivalent) — the fixed category list from `PLAN.md` §8, including `Unorganized`. Don't hardcode category strings elsewhere.
- The existing `(app)` layout and bottom nav — match its structure rather than introducing a parallel navigation pattern for new pages (`/budgets`, `/unorganized`, settings for starting balance).
- Any existing Tailwind theme config / `globals.css` token definitions — extend them with the tokens above rather than creating a second theming system.

## Anti-patterns (explicitly avoid)

- Turning Quick Entry into a multi-step wizard or modal flow.
- Hiding the amount field behind a menu, tab, or secondary screen.
- Using dropdowns for category selection anywhere entry-adjacent.
- Red/alarming color treatment for budget overages (reserve true red for destructive, irreversible actions only).
- A single ambiguous "Delete" action on recurring items that doesn't distinguish occurrence vs. series.
- Hardcoded hex colors in component code instead of theme tokens.
- A third typeface, or bold-body-text-as-emphasis instead of color/label treatment.
