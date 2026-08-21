# Variance — Personal Budgeting App

Quick expense entry (manual + receipt OCR), recurring-transaction intelligence,
and a real analytics dashboard. Mobile-first web app built with Next.js, Supabase,
and Gemini Vision OCR. See [plan.md](plan.md) for the full product spec.

## Stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS** + **shadcn/ui**
- **Supabase** — Auth, Postgres (with Row-Level Security), Storage (`receipts` bucket)
- **Google Gemini** (2.5 Flash) — receipt OCR via `/api/ocr`
- **Recharts** — analytics charts on `/dashboard`
- **Vercel** — hosting + Vercel Cron for recurring transactions

## Prerequisites

- Node.js 20+ and npm
- A [Supabase](https://supabase.com) account (free tier is fine)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A [Vercel](https://vercel.com) account (for deploy)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file from the template and fill in the values:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable                        | Where to find it                                     |
   | ------------------------------- | ---------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL      |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key  |
   | `SUPABASE_SERVICE_ROLE_KEY`     | Supabase → Project Settings → API → service_role key |
   | `GEMINI_API_KEY`                | Google AI Studio → Get API key                       |
   | `GEMINI_MODEL`                  | Defaults to `gemini-2.5-flash`                        |
   | `CRON_SECRET`                   | Any long random string you generate                  |

3. Run the database migrations (see next section).

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Create the Supabase cloud project (click-by-click)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in
   (or create an account).
2. Click **New project**. Pick an org, name it `variance`, choose a region close
   to you, set a database password (save it), and click **Create new project**.
3. Wait for the project to finish provisioning.
4. Open **Project Settings → API**. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never
     commit this, never send it to the browser)
5. Paste those into `.env.local` along with `GEMINI_API_KEY` and a long random
   `CRON_SECRET` (e.g. `openssl rand -hex 32`).
6. Open **Authentication → Providers** and confirm **Email** is enabled.
   (Disable "Confirm email" while you're the only user if you want sign-up to
   land you in the app immediately.)
7. Open **SQL Editor → New query**. Paste the entire contents of
   [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
   and click **Run**. This creates the four tables, indexes, RLS policies, the
   private `receipts` storage bucket, and the storage policies.
8. Verify: **Storage** should list a `receipts` bucket with **Public** off.
   **Table Editor** should list `transactions`, `recurring_rules`,
   `financial_goals`, `budgets`.

To regenerate typed database definitions after schema changes (requires the
Supabase CLI linked to your project):

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npm run db:types
```

## Project structure

```
app/
  (app)/          # Authenticated shell (nav + session gate)
    page.tsx      # Quick Entry (mobile-first landing)
    dashboard/    # Analytics + Needs Confirmation banner
    recurring/    # Recurring-rule management
    goals/        # Financial goals
    budgets/      # Spending limits
    unorganized/  # Re-categorize OCR fallbacks
  api/            # Route handlers (transactions, ocr, recurring-rules, goals, budgets, cron)
  login/          # Supabase auth
components/       # UI + feature components
lib/
  categories.ts   # Fixed category taxonomy (single source of truth)
  recurring.ts    # Due-date / idempotency logic for the cron
  supabase/       # Typed Supabase client helpers (server/browser/admin)
  types/          # Generated database types
supabase/migrations/  # Numbered SQL migrations
vercel.json           # Daily cron → /api/cron/check-recurring
BUILD_PROMPTS.md      # Copy-paste phase prompts
plan.md               # Product spec (source of truth)
```

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server                 |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript type checking             |
| `npm run test`      | Unit tests (validation, OCR, cron due dates) |
| `npm run format`    | Prettier format                      |

## Deploy to Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com) → **Add New → Project** → import the repo.
3. Framework preset: **Next.js**. Root directory: repo root.
4. Under **Environment Variables**, add every key from `.env.local.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CRON_SECRET`)
   for Production (and Preview if you want).
5. Confirm the Supabase migration from the previous section has already been
   run against the **same** project whose keys you just pasted.
6. Click **Deploy**.
7. After the first deploy, open the Vercel project → **Settings → Cron Jobs**
   and confirm `/api/cron/check-recurring` is scheduled daily
   (`0 13 * * *` UTC ≈ 7am MDT / 6am MST, configured in `vercel.json`).
   Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.

### Post-deploy checks

- Visit `/login`, create your account, save a Quick Entry. It should appear on
  `/dashboard`.
- Open `/api/cron/check-recurring` in a browser — it **must** 401 (no secret).
- From a terminal, a correct secret should succeed:

  ```bash
  curl -X POST https://YOUR-DOMAIN/api/cron/check-recurring \
    -H "x-cron-secret: YOUR-CRON-SECRET"
  ```

- In Supabase → Storage → `receipts` → **Policies**: the bucket is not public.
  A signed-out request for an object URL must fail.

Rollback: Vercel → Deployments → ⋮ → **Redeploy** a previous production
deployment. Migrations in this repo are additive; don't drop tables to roll
back schema.
