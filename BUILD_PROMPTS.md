# Build prompts — Variance 0.1

Copy-paste these into Cursor **one phase at a time**. Each prompt assumes the
previous phase is done. The source of truth is [plan.md](plan.md); if anything
here disagrees with the spec, follow `plan.md`.

Locked decisions:

- Hosted **Supabase cloud** (no Docker)
- **Gemini 2.5 Flash** for `/api/ocr` (key already in hand)
- **Vercel** for hosting + Cron (account already in hand)
- `financial_goals.current_amount` is **manual** in v1
- Budget overage is a **passive dashboard indicator** (never blocks entry)

---

## P0 — Scaffold

```
Scaffold the Next.js App Router (TypeScript) project for the plan.md budgeting app: Tailwind + shadcn/ui, ESLint/Prettier, a lib/categories.ts constants file with the exact fixed category list from plan.md §8, a .env.local.example with all env vars from §13, and a README covering setup + env + migrations. Don't build features yet.
```

**Definition of done**

- [ ] `npm run dev` starts a Next.js App Router app
- [ ] Tailwind + shadcn/ui (`components.json`, `components/ui/*`) are wired
- [ ] `lib/categories.ts` contains Groceries, Rent/Mortgage, Utilities, Dining Out, Transportation, Entertainment, Subscriptions, Health/Medical, Shopping, Travel, Other (expenses); Paycheck, Freelance/Side Income, Gift, Refund, Other Income (deposits); plus **Unorganized**
- [ ] `.env.local.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CRON_SECRET`
- [ ] `README.md` covers install, env, and how migrations will be applied
- [ ] No feature pages or API routes yet (auth/entry/OCR/etc. wait for later phases)

---

## P1 — Supabase + schema + auth

```
Set up Supabase for this app: write supabase/migrations/001_initial_schema.sql with all four tables, indexes, and RLS policies exactly per plan.md §8; add typed Supabase server/client helpers and generated types; create the private receipts Storage bucket; build the /login email/password page + auth session middleware (FR-1, FR-2). Give me the exact click-by-click steps to create the cloud project and where to paste keys.
```

**Definition of done**

- [ ] `supabase/migrations/001_initial_schema.sql` creates `transactions`, `recurring_rules` (with `last_run_date`), `financial_goals`, `budgets`, the listed indexes, and RLS `auth.uid() = user_id` on every table
- [ ] Private `receipts` bucket + storage policies namespaced by `user_id`
- [ ] Typed helpers in `lib/supabase/{client,server,middleware,admin}.ts` and `lib/types/database.ts`
- [ ] `/login` supports email/password (magic link acceptable)
- [ ] Unauthenticated visits to app pages redirect to `/login`
- [ ] README (or the assistant reply) has click-by-click: create project, copy URL + anon + service_role keys into `.env.local`, paste+run the migration in SQL Editor
- [ ] **AC-8:** a request without a valid session for that `user_id` is rejected by RLS

---

## P2 — Quick Entry (manual)

```
Build the Quick Entry flow (FR-3–5, AC-1): mobile-first / form with amount, expense/deposit toggle, category chips, optional merchant; optimistic save with toast + reset; POST/GET /api/transactions with auth + validation.
```

**Definition of done**

- [ ] `/` is the mobile-first landing view (~375–430px first)
- [ ] Fields: amount, type toggle, category chips from `lib/categories.ts`, optional merchant
- [ ] Submit is 3 taps or fewer after the amount is typed (amount → category → Save)
- [ ] Optimistic UI: toast + form reset immediately; failed save restores the draft
- [ ] `POST /api/transactions` creates `source=manual`, `status=confirmed`, `transaction_date` defaulting to today
- [ ] `GET /api/transactions` supports date/category/status filters
- [ ] **AC-1:** amount + category + submit produces a row in under 5 seconds end to end
- [ ] Keyboard-accessible type toggle and category chips (`role="radiogroup"` / `aria-checked`)

---

## P3 — Receipt OCR

```
Build Receipt OCR (FR-6–11, AC-2/3): camera/upload button on /, upload image to the private receipts bucket, POST /api/ocr calling Gemini 2.5 Flash for structured JSON, sanitize the response, Unorganized fallback + needsReview, prefill the editable form, non-blocking error fallback, 8MB size cap.
```

**Definition of done**

- [ ] Camera/upload control on Quick Entry (`capture="environment"`)
- [ ] Image uploaded to private `receipts` bucket at `<user_id>/…` before/alongside OCR
- [ ] `POST /api/ocr` is session-authed, rejects images over ~8MB, never exposes `GEMINI_API_KEY`
- [ ] Gemini prompt requests `merchant`, `amount`, `date`, `category` (from the fixed list), `items`; structured JSON
- [ ] Response is sanitized; missing/malformed amount or uncertain category → `Unorganized` + `needsReview: true`
- [ ] Form is pre-filled and always editable; save sets `source=ocr` and `receipt_url`
- [ ] **AC-2:** successful OCR prefills + image stored + `receipt_url` populated on save
- [ ] **AC-3:** OCR failure shows a visible error and leaves the manual form usable (no silent blank state)
- [ ] Server logs outcome only (`ok` / `needs_review` / fail) — never raw model text (PII)

---

## P4 — Recurring rules + cron

```
Build recurring rules + cron (FR-12–17a, AC-4/5/6): /recurring CRUD + /api/recurring-rules, idempotent POST /api/cron/check-recurring guarded by x-cron-secret using last_run_date, the 'Needs Confirmation' banner with Confirm/Edit/Dismiss (dismiss deletes only that occurrence), and vercel.json daily cron.
```

**Definition of done**

- [ ] `/recurring` can create, edit, deactivate, and delete rules (amount, type, category, merchant, frequency, day-of-month / weekday, auto-confirm)
- [ ] `GET/POST /api/recurring-rules` and `PATCH/DELETE /api/recurring-rules/:id` are session-authed
- [ ] `POST` (and GET, for Vercel) `/api/cron/check-recurring` rejects missing/wrong `x-cron-secret` (and accepts `Authorization: Bearer $CRON_SECRET`)
- [ ] Due active rules create a `transactions` row with `source=recurring`; `auto_confirm=false` → `pending_confirmation`, `true` → `confirmed`
- [ ] Idempotent: `last_run_date` + unique `(recurring_rule_id, transaction_date)` so a double run creates exactly one row (**AC-5**)
- [ ] Dashboard banner lists pending rows with Confirm / Edit / Dismiss
- [ ] Confirm → `status=confirmed` (**AC-6**). Dismiss **deletes only that occurrence**. Deactivate rule stops future generation without touching existing rows (FR-17a)
- [ ] `vercel.json` schedules the cron daily
- [ ] **AC-4:** a due rule with `auto_confirm=false` produces exactly one pending row that appears in the banner

---

## P5 — Analytics dashboard

```
Build the /dashboard analytics (FR-18/19, AC-7): Recharts cash-flow trend (trailing 6 months), category donut (selectable range), recent transactions list, responsive to single-column on mobile.
```

**Definition of done**

- [ ] `/dashboard` shows Needs Confirmation (if any), cash-flow bar/line for trailing 6 months, category donut with selectable range (default current month), recent transactions
- [ ] Charts have a text/table fallback (`sr-only` table or equivalent)
- [ ] Layout is two-column on desktop, single-column on phone
- [ ] Empty states have a CTA back to Quick Entry
- [ ] **AC-7:** chart figures match confirmed rows in `transactions` (pending rows are excluded)

---

## P6 — Budgets + Unorganized

```
Build budgets/limits (FR-22–27): /budgets CRUD + /api/budgets, weekly-total + per-category spend-vs-limit bars on the dashboard (warn >=80%, distinct exceeded state, confirmed expenses only), and the /unorganized re-categorize view.
```

**Definition of done**

- [ ] `/budgets` can set one weekly total and any number of per-category limits
- [ ] `GET/POST /api/budgets` and `PATCH/DELETE /api/budgets/:id` are session-authed; GET includes spend-vs-limit
- [ ] Dashboard bars: warn at ≥80%, distinct treatment when exceeded; **passive only** (FR-24)
- [ ] Spend counts **confirmed expenses only** (FR-25)
- [ ] `/unorganized` lists `category = Unorganized` with a one-tap recategorize (FR-27)
- [ ] Exceeding a limit never blocks Quick Entry or OCR save

---

## P7 — Goals

```
Build goals (FR-20/21): /goals CRUD + /api/goals and dashboard progress bars; keep current_amount manual for v1.
```

**Definition of done**

- [ ] `/goals` can create, edit, delete goals (title, target, current, optional target date)
- [ ] `GET/POST /api/goals` and `PATCH/DELETE /api/goals/:id` are session-authed
- [ ] Dashboard renders progress bars (`current / target`) for all goals (**AC-7**)
- [ ] `current_amount` is edited by the user — no auto-accrual from deposits in v1

---

## P8 — Deploy

```
Prepare and run the Vercel deploy (§15): link the project, set all env vars, run the Supabase migrations, verify RLS + private bucket + cron secret, then do the first production deploy and configure the cron schedule.
```

**Definition of done**

- [ ] `vercel.json` daily cron is in the repo
- [ ] README documents: import repo → set env vars → run `001_initial_schema.sql` → confirm `receipts` bucket is **not** public → deploy
- [ ] `/api/cron/check-recurring` 401s without the secret
- [ ] Production login works; a Quick Entry save persists; a test OCR (optional) stores a private object
- [ ] Cron schedule is visible in the Vercel project (Hobby allows daily)

---

## Suggested order of a live session

1. Paste **P0**. Confirm the scaffold.
2. Create the Supabase project (click-by-click from P1), then paste **P1**.
3. Paste **P2**, log a real coffee, confirm AC-1.
4. Paste **P3**, scan one receipt, confirm AC-2/3.
5. Paste **P4**, create a rule due today, hit the cron with `x-cron-secret`, confirm the banner. Hit it again, confirm no duplicate.
6. Paste **P5**–**P7** in order, then **P8** when you're ready to go live.
