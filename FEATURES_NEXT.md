# Feature Backlog — Post-MVP

> Companion to `PLAN.md`. These are prioritized additions to build **after** the MVP (Quick Entry, OCR, Recurring, Analytics, Budgets, Goals) is working end to end. Don't start these until the core flows in `PLAN.md` are functional — this doc assumes that schema and app structure already exist. Build in the order listed; each section is scoped to be shippable independently.

---

## 1. Starting Balance + Running "Available" (highest priority)

**Why**: Turns the dashboard from "here's what happened" into "here's what I actually have" — the single highest-leverage UX change available right now.

**Schema**
```sql
-- Add to a user settings/profile table (create one if it doesn't exist yet)
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    starting_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    starting_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- RLS: same auth.uid() = user_id pattern as every other table
```

**Logic**
- Running balance = `starting_balance` + SUM(confirmed deposits since `starting_balance_date`) − SUM(confirmed expenses since `starting_balance_date`).
- `pending_confirmation` transactions MUST NOT count toward the balance until confirmed.
- Compute server-side (API route or a Postgres view) rather than duplicating the calc in multiple client components.

**Reconcile / balance adjustment**
- Add a lightweight "Reconcile" action: user enters what their real balance is today, the app creates a single adjustment transaction (`category = 'Balance Adjustment'`, could reuse `type = 'deposit'`/`'expense'` depending on sign) for the difference. Keeps the ledger honest without rewriting history.

**UI**
- Add "Available now" as the hero metric on `/dashboard`, above the existing charts — bigger and higher on the page than the category donut.
- Settings page (new, or add to `/login`-adjacent account area) to set/edit starting balance.

**Acceptance criteria**
- Given a starting balance and a mix of confirmed/pending transactions, the running balance only reflects confirmed ones.
- Given a Reconcile action, a new transaction is created and the running balance matches what the user entered.

---

## 2. Merchant Memory (OCR learning)

**Why**: Compounds with every receipt scan — fewer taps to correct a category over time, directly reduces the friction that causes budgeting fatigue.

**Schema**
```sql
CREATE TABLE merchant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, merchant)
);
-- RLS: same pattern
```

**Logic**
- On transaction save (manual or OCR), if `merchant` is set, upsert `(user_id, merchant) -> category` into `merchant_categories`.
- On OCR result, before falling back to the LLM's guessed category (or `Unorganized`), check `merchant_categories` for an exact (or fuzzy — keep it simple, exact-match first) match on the parsed merchant name and pre-fill that category instead.
- This is a pre-fill, not an override — the user can always change it before saving.

**Acceptance criteria**
- Given a user has previously confirmed "Trader Joe's" → "Groceries", the next receipt OCR'd from "Trader Joe's" pre-fills "Groceries" instead of whatever the LLM guesses.

---

## 3. Snooze vs. Dismiss on Recurring Transactions

**Why**: `PLAN.md` already distinguishes "skip this occurrence" (Dismiss) from "cancel the whole series" (deactivate the rule) — this adds a true middle option: skip this cycle but keep a record that it happened, rather than silently deleting the row.

**Schema change**
- On the `transactions` table, allow `status = 'skipped'` in addition to `'confirmed'` / `'pending_confirmation'`.
- Update the `CHECK` constraint: `status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending_confirmation', 'skipped'))`.

**Logic**
- "Dismiss" on a pending transaction (existing behavior) now sets `status = 'skipped'` instead of deleting the row — preserves history.
- Skipped rows are excluded from balance calculations and analytics totals, but visible in a "history" or "recurring log" view if you build one later (not required for this pass).
- The recurring rule itself is untouched either way — this only affects the individual occurrence.

**Acceptance criteria**
- Given a pending recurring transaction, when the user dismisses it, the row's status becomes `skipped` (not deleted) and it disappears from the "Needs Confirmation" banner and from balance/analytics totals.

---

## 4. UI / Visual Pass on Entry + Dashboard

**Why**: Do this once core flows work end to end, before layering more features onto an unpolished shell.

**Use the companion skill**: `variance-ui-skill.md` (see the other file) — it encodes the Variance brand's palette, typography, and this app's specific UI constraints (passive budgets, mobile-first Entry, Unorganized bucket, Google-Calendar-style recurring). Apply it when touching any UI in this section.

**Scope for this pass**
- Quick Entry: last-used category pre-selected, "recent merchants" chips for one-tap merchant fill, category chips instead of a dropdown (per the skill's anti-patterns).
- Dashboard hierarchy: "Available now" hero metric (from #1 above) → Needs Confirmation banner → budget/limit bars → charts. Reduce scroll depth on mobile.
- Empty states: distinct, on-brand CTA for first expense, first goal, first recurring rule, first budget.
- Dark mode: wire up the dual palette from the style guide (Light Mode / Dark Mode token sets) using CSS variables; verify Recharts chart colors adapt too, not just the surrounding UI.
- Save confirmation: subtle motion/toast on transaction save; animated progress bars on budgets/goals (respect `prefers-reduced-motion`).

**Acceptance criteria**
- Every screen from `PLAN.md` §10 renders correctly in both light and dark mode using the token names from the skill, with no hardcoded hex values in component code.

---

## 5. Export CSV

**Why**: Low effort, disproportionate trust signal — useful regardless of whether this stays a personal tool or ever becomes something others use.

**Scope**
- New route, e.g. `GET /api/export/transactions` — auth required, streams/returns a CSV of the requesting user's confirmed transactions (respect any date-range query params the dashboard's filters already support).
- Simple "Export CSV" button somewhere reachable from `/dashboard` (e.g. near the transactions list) — no new page needed.
- Columns: date, type, category, merchant, amount, source, status. Keep it simple — this isn't a full backup/restore feature (that's a separate, later idea if you want it).

**Acceptance criteria**
- Given confirmed transactions exist, clicking Export downloads a CSV with one row per transaction and correct column headers.

---

## Deliberately deferred (do not build yet)

These came up in planning discussion but are lower priority — don't build them as part of this pass. Revisit only after the above five are done and you've used the app daily for a few weeks:

- Goal-linked deposits (auto-incrementing `current_amount` from tagged deposits)
- Multi-account / transfers between accounts
- Envelope-style budgeting / rollover budgets
- Bank sync (Plaid), multi-currency, shared households
- Full offline queue / PWA install prompt
- Audit log, backup/restore beyond the CSV export above
