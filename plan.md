# 0.1 — Personal Budgeting App (Quick Entry + Analytics)

> Implementation plan. Greenfield project — no existing repo to reference. This document is the single source of truth for the build; hand it to Cursor as the project brief.

## Metadata

| Field                | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| **Feature ID**       | 0.1 (project root)                                                 |
| **Section**          | Core App — MVP                                                     |
| **Severity**         | BLOCKER (nothing ships without this)                                |
| **Platform**         | Web (mobile-first responsive), deployed to Vercel                  |
| **Status (today)**   | MISSING — greenfield build                                         |
| **Estimated effort** | M (2–4 weeks, solo)                                                 |
| **Owner (proposed)** | Dallas (solo dev, AI-assisted via Cursor)                          |
| **Depends on**       | None                                                                |
| **Unblocks**         | All future features (budgets v2, shared households, bank sync, etc.) |

---

## 1. Problem Statement

Existing budgeting apps are either too slow for daily use (too many taps to log a coffee) or too shallow for real analysis (no real charts, no recurring-transaction intelligence). This app solves both: a sub-5-second manual/OCR entry flow for mobile, paired with a proper analytics dashboard for desktop. It's a personal-use tool, so scope is deliberately tight — single-user auth, no multi-tenant/sharing complexity in v1.

## 2. Goals

- Manual transaction entry (amount → category → submit) completes in under 5 seconds on mobile.
- Receipt photo upload auto-fills a transaction via Vision LLM OCR, savable in one tap.
- Recurring transactions (rent, paychecks, subscriptions) auto-generate pending entries a user just confirms/edits/dismisses.
- A desktop analytics view shows cash flow trends, category breakdown, and savings goal progress.
- The whole app is usable and legible on a phone screen — this is the default surface, not an afterthought.

## 3. Non-Goals

- No multi-user households or shared budgets in v1 (single `auth.users` row per account, `user_id`-scoped everything).
- No direct bank account linking / Plaid integration in v1 — entry is manual or OCR only.
- No native mobile app — mobile web (PWA-friendly) only.
- No multi-currency support in v1 — assume a single currency, no FX conversion.
- No budgeting "envelopes"/zero-based budgeting methodology — v1 budgets are simple weekly and per-category spending limits with progress/overage indicators, not a full budget-allocation system where every dollar is assigned somewhere.
- No export/import (CSV, bank statement import) in v1.

## 4. Personas & User Stories

Single persona: the app owner (Dallas), using it as their own daily budgeting tool.

- **As the user**, I want to log an expense in under 5 seconds so logging never feels like a chore I skip.
- **As the user**, I want to snap a photo of a receipt and have the amount/merchant/category pre-filled so I don't have to retype what's already on the paper.
- **As the user**, I want recurring bills and my paycheck to show up automatically so I don't forget to log them.
- **As the user**, I want a clear "needs your attention" banner for auto-detected recurring transactions so nothing posts to my ledger without my say-so (unless I've explicitly turned on auto-confirm for that rule).
- **As the user**, I want to cancel just one occurrence of a recurring transaction without cancelling the whole recurring rule, the way I'd cancel a single Google Calendar event vs. the whole series.
- **As the user**, I want to see monthly income vs. expense trends and a category breakdown so I understand where money actually goes.
- **As the user**, I want to set a weekly spending limit and per-category spending limits so I can see if I'm about to go over before I do.
- **As the user**, I want receipts the OCR can't confidently categorize to land in an "Unorganized" bucket instead of a wrong category, so I can go sort them myself later.
- **As the user**, I want to track progress toward savings goals so I stay motivated.

## 5. Functional Requirements

**Auth & Account**
- **FR-1.** The system MUST use Supabase Auth (email/password, magic link acceptable) for a single-user account.
- **FR-2.** All data tables MUST enforce row-level security scoped to `auth.uid() = user_id`.

**Quick Entry**
- **FR-3.** The system MUST provide a mobile-first quick-entry form with fields: amount, type (expense/deposit), category, optional merchant — submittable in 3 taps or fewer after the amount is typed.
- **FR-4.** The system MUST default `transaction_date` to today and `source` to `manual` for entries created via the quick-entry form.
- **FR-5.** The system MUST persist a new transaction on submit without a full page navigation (optimistic UI update, background save).

**Receipt OCR**
- **FR-6.** The system MUST allow the user to upload or capture a receipt image from the quick-entry view.
- **FR-7.** The system MUST upload the receipt image to a private Supabase Storage bucket (`receipts`) before or alongside OCR processing.
- **FR-8.** The system MUST send the receipt image to a Vision LLM via `/api/ocr`, requesting a structured JSON response with `merchant`, `amount`, `date`, `category`, and `items`.
- **FR-9.** The system MUST pre-fill the transaction form with the OCR result and let the user edit any field before saving.
- **FR-10.** The system MUST set `source = 'ocr'` and store the uploaded image's path in `receipt_url` for OCR-originated transactions.
- **FR-11.** The system MUST handle OCR failures (bad image, API error, low-confidence parse) by falling back to an empty/manual form with a visible error notice, never a silent failure.

**Recurring Transactions**
- **FR-12.** The system MUST let the user create, edit, deactivate, and delete recurring rules (amount, type, category, merchant, frequency, day-of-month, auto-confirm flag).
- **FR-13.** A daily scheduled job (`/api/cron/check-recurring`) MUST scan active rules and create a `transactions` row with `status = 'pending_confirmation'` and `source = 'recurring'` when a rule is due.
- **FR-14.** If a rule's `auto_confirm` is `TRUE`, the system MUST create the transaction directly with `status = 'confirmed'` instead of `pending_confirmation`.
- **FR-15.** The system MUST prevent duplicate generation for the same rule + due date (idempotent cron run).
- **FR-16.** The dashboard MUST display a "Needs Confirmation" banner listing all `pending_confirmation` transactions with **Confirm**, **Edit**, and **Dismiss** actions.
- **FR-17.** Confirming a pending transaction MUST set `status = 'confirmed'`. Dismissing a single pending transaction MUST delete only that occurrence's row — it MUST NOT affect the parent `recurring_rules` row or any future occurrence (Google Calendar's "delete this event only" model).
- **FR-17a.** Deactivating a recurring rule (`is_active = FALSE`) MUST stop all future occurrences from being generated (Google Calendar's "delete the whole series" model) without touching any already-created transaction rows, past or pending.

**Budgets & Spending Limits**
- **FR-22.** The system MUST let the user set an optional weekly total spending limit.
- **FR-23.** The system MUST let the user set an optional spending limit per category.
- **FR-24.** The dashboard MUST show current spend vs. limit (weekly total and per-category) with a clear visual indicator when a limit is approached (e.g. ≥80%) or exceeded. This is a **passive, dashboard-only indicator for v1** — exceeding a limit MUST NOT block or interrupt manual entry, OCR save, or any other action.
- **FR-25.** Limit checks MUST only count `confirmed` transactions of `type = 'expense'`, not `pending_confirmation` ones.
- **FR-26.** The system MUST include an "Unorganized" category in the fixed category list, used as the fallback when OCR can't confidently categorize a receipt.
- **FR-27.** The dashboard or a dedicated view MUST surface transactions still in the "Unorganized" category so the user can re-categorize them in bulk.

**Analytics**
- **FR-18.** The system MUST render a monthly income-vs-expense trend chart (line or bar) covering at least the trailing 6 months.
- **FR-19.** The system MUST render a category breakdown (donut chart) for a selectable time range (default: current month).
- **FR-20.** The system MUST render savings goal progress bars (current / target) for all active goals.
- **FR-21.** The system MUST let the user create, edit, and delete financial goals.

## 6. Non-Functional Requirements

- **Performance** — Quick-entry form submit MUST feel instant (optimistic update); OCR round-trip SHOULD complete within 8s on a typical mobile connection, with a visible loading state throughout.
- **Security** — Supabase RLS on every table; the `receipts` Storage bucket MUST be private with access via signed URLs only, never public. The `/api/ocr` and `/api/cron/check-recurring` routes MUST verify the caller (session for OCR; a shared cron secret header for the scheduled job).
- **Privacy & Compliance** — This is a personal single-user app; no third-party data sharing. Receipt images may contain sensitive purchase data — treat the bucket as private by default, no exceptions.
- **Accessibility** — Forms MUST be keyboard-navigable with visible focus states and correct label associations; charts SHOULD have a text/table fallback for screen readers.
- **Scalability** — Single-user data volume; no special partitioning needed. Design queries to stay fast to ~50k transaction rows.
- **Reliability** — The recurring-check cron MUST be idempotent and safe to re-run; a failed OCR call must never corrupt or duplicate a transaction row.
- **Observability** — Log OCR request/response outcomes (success/fail/low-confidence) and cron run summaries (rules scanned, transactions created) server-side for debugging.
- **Maintainability** — Standard Next.js App Router conventions; colocate API routes under `app/api/`; typed Supabase client via generated types.
- **Backward compatibility** — N/A (greenfield); Cursor should still use numbered SQL migration files (`supabase/migrations/NNN_description.sql`) from the start so future changes are trackable.

## 7. Acceptance Criteria

- **AC-1.** *Given* the quick-entry view, *When* the user enters an amount, picks a category, and taps submit, *Then* a new `transactions` row is created with `source = 'manual'`, `status = 'confirmed'`, and today's date, in under 5 seconds end to end.
- **AC-2.** *Given* a receipt photo upload, *When* OCR succeeds, *Then* the form is pre-filled with merchant/amount/date/category and the image is stored in the private `receipts` bucket with `receipt_url` populated on save.
- **AC-3.** *Given* OCR fails or returns malformed data, *When* the user is on the entry form, *Then* the form remains usable for manual entry and a clear error is shown (no silent blank state).
- **AC-4.** *Given* an active recurring rule due today with `auto_confirm = FALSE`, *When* the cron job runs, *Then* exactly one `pending_confirmation` transaction is created and it appears in the "Needs Confirmation" banner.
- **AC-5.** *Given* the cron job runs twice on the same day for the same rule, *When* the second run executes, *Then* no duplicate transaction is created.
- **AC-6.** *Given* a pending transaction in the banner, *When* the user taps Confirm, *Then* its status becomes `confirmed` and it disappears from the banner and appears in analytics totals.
- **AC-7.** *Given* transactions exist across multiple months, *When* the user opens the analytics dashboard, *Then* the cash-flow chart, category donut, and goal progress bars all render with data matching the underlying `transactions`/`financial_goals` tables.
- **AC-8.** *Given* any table access, *When* a request is made without a valid session for that `user_id`, *Then* Supabase RLS rejects it.

## 8. Data Model

Three core tables as specified (see SQL below) plus indexes. All tables use `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE` and RLS policies restricting all operations to `auth.uid() = user_id`.

```sql
-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('expense', 'deposit')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    merchant VARCHAR(100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'ocr', 'recurring'
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'pending_confirmation'
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring transaction rules
CREATE TABLE recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('expense', 'deposit')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    merchant VARCHAR(100),
    frequency VARCHAR(20) DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly'
    day_of_month INT,
    auto_confirm BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_date DATE, -- tracks last generation to keep cron idempotent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial goals
CREATE TABLE financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) DEFAULT 0.00,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets / spending limits (weekly total and/or per-category)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope VARCHAR(20) CHECK (scope IN ('weekly_total', 'category')) NOT NULL,
    category VARCHAR(50), -- NULL when scope = 'weekly_total'; required when scope = 'category'
    limit_amount NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT category_required_for_category_scope
        CHECK (scope = 'weekly_total' OR category IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(user_id, status) WHERE status = 'pending_confirmation';
CREATE INDEX idx_recurring_rules_active ON recurring_rules(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_budgets_active ON budgets(user_id, is_active) WHERE is_active = TRUE;
```

- Fixed category list (v1, used by the category picker, the OCR prompt, and per-category budgets): **Groceries, Rent/Mortgage, Utilities, Dining Out, Transportation, Entertainment, Subscriptions, Health/Medical, Shopping, Travel, Other** (expenses); **Paycheck, Freelance/Side Income, Gift, Refund, Other Income** (deposits); plus **Unorganized** as the OCR low-confidence fallback (FR-26). Not enforced at the DB level via `CHECK` since it's easy to outgrow — enforce it in application code/a shared constants file instead so it's a one-line change later.
- Migration file convention: `supabase/migrations/001_initial_schema.sql`, `002_...`, etc.
- `last_run_date` on `recurring_rules` is an addition beyond the original spec — needed to make the cron idempotent per AC-5; note this for the user if it wasn't expected.
- The `budgets` table is a v1 addition beyond the original spec (see FR-22–27) — one row per limit, so a user can have one `weekly_total` row and any number of `category` rows.
- Backfill: N/A, no existing data.
- RLS: enable on all four tables; policy `USING (auth.uid() = user_id)` for `SELECT`/`UPDATE`/`DELETE`, `WITH CHECK (auth.uid() = user_id)` for `INSERT`.

## 9. API Surface

- **`POST /api/transactions`** — auth required. Body: `{ amount, type, category, merchant?, transaction_date?, source? }`. Creates a confirmed manual transaction. Returns the created row.
- **`GET /api/transactions`** — auth required. Query params for date range, category, status filters. Returns paginated list.
- **`PATCH /api/transactions/:id`** — auth required. Used for Confirm/Edit actions on pending transactions and general edits.
- **`DELETE /api/transactions/:id`** — auth required. Used for Dismiss.
- **`POST /api/ocr`** — auth required. Body: multipart image or `{ imageUrl }` after Storage upload. Sends image to Vision LLM with a structured-output prompt; returns `{ merchant, amount, date, category, items }`. MUST validate/sanitize the LLM's JSON before returning (reject if `amount` isn't numeric, etc.).
- **`GET/POST/PATCH/DELETE /api/recurring-rules`** (and `/:id` for single-resource ops) — CRUD for recurring rules, auth required.
- **`GET/POST/PATCH/DELETE /api/goals`** (and `/:id`) — CRUD for financial goals, auth required.
- **`GET/POST/PATCH/DELETE /api/budgets`** (and `/:id`) — CRUD for weekly-total and per-category spending limits, auth required. `GET` SHOULD support returning current spend-vs-limit computed server-side (or the client computes it from `/api/transactions`).
- **`POST /api/cron/check-recurring`** — no user session; authenticated via a shared secret header (e.g. `x-cron-secret`, matched against an env var) since Vercel Cron calls it directly. Scans due rules, creates transactions, updates `last_run_date`.
- All routes return standard JSON error shapes `{ error: string }` with appropriate HTTP status codes (400 validation, 401 unauthorized, 500 server error).
- Rate limiting: not required for a single-user app in v1, but the `/api/ocr` route SHOULD cap request size (reject images over ~8MB) to control Vision API cost.

## 10. UI / UX

**Pages / Views**
1. `/` — Mobile-first Quick Entry (default landing view). Big amount input, category picker (chips or select), type toggle (expense/deposit), submit button, and a camera/upload button for receipts.
2. `/dashboard` — Desktop-oriented analytics view: "Needs Confirmation" banner at top, budget/limit progress (weekly total + per-category), cash-flow trend chart, category donut, goals section, recent transactions list.
3. `/recurring` — Manage recurring rules (list + create/edit form). Each rule's occurrence list shows Dismiss (skip this one) separately from a rule-level Deactivate/Delete (cancel the whole series).
4. `/goals` — Manage financial goals (list + create/edit form).
5. `/budgets` — Set/edit the weekly total limit and per-category limits; shows current spend vs. limit for each.
6. `/unorganized` (or a filtered view within `/dashboard`) — List of transactions still in the "Unorganized" category with a quick re-categorize action.
7. `/login` — Supabase Auth (email/password or magic link).

**Key Flows**
1. Quick entry: open app → type amount → tap category → tap Save → toast confirmation → form resets, ready for next entry.
2. Receipt entry: open app → tap camera icon → capture/select image → loading state while OCR runs → form pre-filled (falls into "Unorganized" if OCR wasn't confident on category) → user reviews/edits → tap Save.
3. Recurring confirmation: user opens dashboard → sees "Needs Confirmation" banner with card(s) → taps Confirm (accepts as-is), Edit (opens pre-filled form), or Dismiss (skips just this occurrence — the rule keeps running next cycle).
4. Cancel a whole recurring series: user opens `/recurring` → picks the rule → Deactivate or Delete → no further occurrences are generated.
5. Budget check: user opens `/dashboard` or `/budgets` → sees weekly total and per-category bars → visual warning at ≥80% of a limit, different treatment once exceeded.
6. Goal tracking: user opens `/goals` → sees progress bars → can update `current_amount` manually or it accrues from tagged deposits (see Open Questions).

**States**
- Empty states: no transactions yet ("Log your first expense"), no recurring rules, no goals — each with a clear CTA.
- Loading states: skeleton/spinner for OCR processing, chart data fetch, cron-triggered banner refresh.
- Error states: OCR failure banner (non-blocking, form still usable), failed save with retry option.
- Offline: not required for v1, but the quick-entry form SHOULD not lose typed data on a transient network blip (keep client-side state until save confirms).

**Responsive Behavior**
- Quick Entry is optimized for phone width (~375–430px) first; scales up gracefully but isn't the primary desktop view.
- Dashboard/analytics assumes wider viewports for chart layout but must still degrade to single-column on mobile.

**Accessibility**
- Category picker and type toggle must be operable via keyboard and screen reader (proper `role`/`aria-label`), not solely icon-based with no text alternative.
- Focus moves to the form's first invalid field on validation error.

## 11. AI / ML Considerations

- **Model**: **Gemini** (Flash-tier — Gemini 2.5 Flash or Flash-Lite) for `/api/ocr`. Cheapest of the viable providers and vision-capable with structured JSON output. The OCR route is a single isolated API call, so swapping providers later only touches `/api/ocr`, not the rest of the app.
- **Prompt**: instruct the model to extract `merchant`, `amount` (numeric, total), `date` (ISO format), a best-guess `category` from the fixed category list (falling back to `Unorganized` when uncertain per FR-26), and `items` (array of line items if legible). Request JSON-schema/structured output mode, not free-text parsing.
- **Fallback path**: if the model returns malformed JSON, missing required fields, or low-confidence output, the API returns a partial result plus a `needsReview: true` flag rather than failing outright — the client always falls back to a manual-editable form (FR-11), and an uncertain category defaults to `Unorganized` rather than guessing wrong.
- **PII/redaction**: receipts may contain card numbers or personal info if photographed at odd angles — no PII should be logged server-side beyond what's needed for the parsed transaction fields; avoid storing raw model responses long-term.
- **Cost budget**: this is a personal app, but the `/api/ocr` route should avoid unnecessary re-calls (e.g. don't re-run OCR automatically on form edits) to keep API spend predictable.

## 12. Integration Points

- **Supabase** — Auth, Postgres (all three tables + RLS), Storage (`receipts` private bucket).
- **Vision LLM API** — external call from `/api/ocr`; API key stored as a Vercel/Next.js environment variable, never exposed client-side.
- **Vercel Cron** — triggers `/api/cron/check-recurring` on a daily schedule (configured in `vercel.json`).
- **Recharts** — client-side chart rendering on `/dashboard`, fed by data fetched from `/api/transactions` and aggregation queries.

## 13. Dependencies & Sequencing

- Must ship in order: (1) Supabase schema + RLS + auth, (2) Quick Entry manual flow, (3) Receipt OCR flow, (4) Recurring rules + cron, (5) Analytics dashboard, (6) Budgets/limits, (7) Goals.
- Shared infra needed before any feature work: Supabase project provisioned, `receipts` Storage bucket created, Vercel project linked with env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Vision LLM API key, `CRON_SECRET`).

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Vision LLM misreads receipt totals/dates | M | M | Always show an editable form after OCR; never auto-save without user confirmation |
| Cron double-fires and duplicates recurring transactions | M | M | `last_run_date` check + idempotent upsert logic in FR-15/AC-5 |
| Receipt images leak via public Storage misconfiguration | L | H | Bucket set private from creation; access only via signed URLs; verify in a manual test before first real receipt upload |
| Category taxonomy drifts inconsistent (free text vs. fixed list) | M | L | Fixed category list (§8) used by both manual entry and the OCR prompt; low-confidence OCR falls into "Unorganized" instead of guessing |
| Vision API cost/latency spikes | L | L | Cap image upload size; avoid redundant OCR calls on edits |

## 15. Rollout Plan

- No feature flags needed — single-user personal app, deploy straight to production on Vercel.
- Sequencing: run migrations against Supabase → deploy app → manually verify RLS with a test account → set up Vercel Cron schedule → start real usage.
- No pilot cohort (personal app).
- Rollback path: Vercel's instant rollback to a previous deployment; Supabase migrations should be additive/reversible where practical.

## 16. Test Plan

- **Unit** — category/amount validation logic, OCR response sanitization, recurring-rule due-date calculation.
- **Integration** — API routes against a local/test Supabase instance: transaction CRUD, RLS enforcement (attempt cross-user access and confirm rejection), cron idempotency (run twice, assert one transaction).
- **End-to-end** — happy path: manual entry save; receipt OCR upload → prefill → save; recurring rule creation → simulated cron run → confirm banner appears → confirm action.
- **Security** — verify `receipts` bucket is not publicly readable; verify `/api/cron/check-recurring` rejects requests without the correct secret header.
- **Accessibility** — manual keyboard-only pass through Quick Entry and Dashboard.
- **Performance** — manual check that Quick Entry submit feels instant on a throttled mobile connection.
- **Manual exploratory** — use the app for a few real days of personal transactions before considering v1 "done."

## 17. Documentation & Training

- N/A for end-user docs (single user, is the developer).
- Keep a short `README.md` in the repo covering local setup, env vars, and how to run Supabase migrations.
- Document the fixed category list and the recurring-rule/cron behavior inline in code comments since Cursor (and future-you) will need to reason about it later.

## 18. Open Questions

1. ~~Should Dismissing a pending recurring transaction delete the row outright, or mark it `dismissed`?~~ **Resolved**: Dismiss = skip this occurrence only (delete that transaction row); Deactivate/Delete on the rule itself = cancel the whole series (FR-17/17a) — the Google Calendar mental model.
2. Should `financial_goals.current_amount` update automatically from deposits tagged to that goal, or stay purely manual? Still open — spec above treats it as manual-only for v1; flagged as a likely v1.1 addition once the tagging mechanic (`goal_id` on `transactions`) is designed.
3. ~~What's the fixed category list?~~ **Resolved** — see §8 for the full list, including the new `Unorganized` fallback category.
4. ~~Which Vision LLM provider/model should `/api/ocr` call?~~ **Leaning Gemini** (Flash-tier) per §11 and the accompanying provider comparison — not fully locked, revisit once you've test-run a few real receipts through it.
5. Should exceeding a budget limit (weekly total or per-category) block/warn on new entries, or just be a passive dashboard indicator? Spec above assumes passive-only for v1 (no blocking) — flag if you want an in-the-moment warning at entry time too.

## 19. References

- Original spec: this conversation's requirements (Next.js App Router, Tailwind, shadcn/ui, Supabase, Recharts, Vision LLM OCR, Vercel deploy).
- Plan template source: [StudyDrift/lextures `_TEMPLATE.md`](https://github.com/StudyDrift/lextures/blob/main/docs/plan/_TEMPLATE.md).
