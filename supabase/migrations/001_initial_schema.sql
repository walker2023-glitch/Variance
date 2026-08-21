-- =============================================================================
-- 001_initial_schema.sql
-- Variance budgeting app — initial schema (plan.md section 8).
--
-- Creates the four core tables (transactions, recurring_rules,
-- financial_goals, budgets), their indexes, Row-Level Security policies scoped
-- to auth.uid() = user_id, and the RLS policies for the private `receipts`
-- Storage bucket.
--
-- Apply via Supabase SQL Editor (paste + Run) or the Supabase CLI.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('expense', 'deposit')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    merchant VARCHAR(100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(20) DEFAULT 'manual',        -- 'manual', 'ocr', 'recurring'
    status VARCHAR(20) DEFAULT 'confirmed',      -- 'confirmed', 'pending_confirmation'
    receipt_url TEXT,
    -- Links a generated transaction back to the rule that created it, so cron
    -- can enforce idempotency (one row per rule per due date). Set only for
    -- source = 'recurring'. FK added after recurring_rules is created below.
    recurring_rule_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Recurring transaction rules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('expense', 'deposit')) NOT NULL,
    category VARCHAR(50) NOT NULL,
    merchant VARCHAR(100),
    frequency VARCHAR(20) DEFAULT 'monthly',     -- 'weekly', 'biweekly', 'monthly'
    day_of_month INT,
    auto_confirm BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_date DATE,                          -- keeps the cron idempotent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- The transactions.recurring_rule_id FK references recurring_rules, which is
-- created after transactions above. Add the constraint now that both exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_recurring_rule_id_fkey'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_recurring_rule_id_fkey
            FOREIGN KEY (recurring_rule_id)
            REFERENCES recurring_rules(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Financial goals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    target_amount NUMERIC(10, 2) NOT NULL,
    current_amount NUMERIC(10, 2) DEFAULT 0.00,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Budgets / spending limits (weekly total and/or per-category)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope VARCHAR(20) CHECK (scope IN ('weekly_total', 'category')) NOT NULL,
    category VARCHAR(50),  -- NULL when scope = 'weekly_total'; required for 'category'
    limit_amount NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT category_required_for_category_scope
        CHECK (scope = 'weekly_total' OR category IS NOT NULL)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(user_id, status) WHERE status = 'pending_confirmation';
CREATE INDEX IF NOT EXISTS idx_recurring_rules_active
    ON recurring_rules(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_budgets_active
    ON budgets(user_id, is_active) WHERE is_active = TRUE;
-- Unique (rule + due date) so a double-fired cron cannot insert duplicates (AC-5).
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_rule_date
    ON transactions(recurring_rule_id, transaction_date)
    WHERE recurring_rule_id IS NOT NULL;

-- =============================================================================
-- Row-Level Security
-- Every table: users can only read/write their own rows (auth.uid() = user_id).
-- =============================================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- transactions
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
CREATE POLICY "transactions_select_own" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
CREATE POLICY "transactions_insert_own" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
CREATE POLICY "transactions_update_own" ON transactions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;
CREATE POLICY "transactions_delete_own" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- recurring_rules
DROP POLICY IF EXISTS "recurring_rules_select_own" ON recurring_rules;
CREATE POLICY "recurring_rules_select_own" ON recurring_rules
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_rules_insert_own" ON recurring_rules;
CREATE POLICY "recurring_rules_insert_own" ON recurring_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_rules_update_own" ON recurring_rules;
CREATE POLICY "recurring_rules_update_own" ON recurring_rules
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "recurring_rules_delete_own" ON recurring_rules;
CREATE POLICY "recurring_rules_delete_own" ON recurring_rules
    FOR DELETE USING (auth.uid() = user_id);

-- financial_goals
DROP POLICY IF EXISTS "financial_goals_select_own" ON financial_goals;
CREATE POLICY "financial_goals_select_own" ON financial_goals
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "financial_goals_insert_own" ON financial_goals;
CREATE POLICY "financial_goals_insert_own" ON financial_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "financial_goals_update_own" ON financial_goals;
CREATE POLICY "financial_goals_update_own" ON financial_goals
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "financial_goals_delete_own" ON financial_goals;
CREATE POLICY "financial_goals_delete_own" ON financial_goals
    FOR DELETE USING (auth.uid() = user_id);

-- budgets
DROP POLICY IF EXISTS "budgets_select_own" ON budgets;
CREATE POLICY "budgets_select_own" ON budgets
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_insert_own" ON budgets;
CREATE POLICY "budgets_insert_own" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_update_own" ON budgets;
CREATE POLICY "budgets_update_own" ON budgets
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "budgets_delete_own" ON budgets;
CREATE POLICY "budgets_delete_own" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- Storage: private `receipts` bucket policies
-- Create the bucket first (Storage -> New bucket -> name `receipts`, NOT public),
-- or uncomment the insert below. Files are namespaced per-user by storing them
-- under a `<user_id>/...` path prefix; policies enforce that ownership.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
CREATE POLICY "receipts_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
CREATE POLICY "receipts_insert_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;
CREATE POLICY "receipts_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
