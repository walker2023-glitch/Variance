/**
 * Hand-written Supabase database types matching
 * supabase/migrations/001_initial_schema.sql.
 *
 * Shape follows `supabase gen types typescript` so the client generic
 * satisfies GenericSchema (Insert/Update resolve correctly).
 *
 * Regenerate from the live schema with `npm run db:types` once the Supabase
 * CLI is linked (`supabase link`), which will overwrite this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType = "expense" | "deposit";
export type TransactionSource = "manual" | "ocr" | "recurring";
export type TransactionStatus = "confirmed" | "pending_confirmation";
export type RecurringFrequency = "weekly" | "biweekly" | "monthly";
export type BudgetScope = "weekly_total" | "category";

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: TransactionType;
          category: string;
          merchant: string | null;
          transaction_date: string;
          source: TransactionSource;
          status: TransactionStatus;
          receipt_url: string | null;
          recurring_rule_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: TransactionType;
          category: string;
          merchant?: string | null;
          transaction_date?: string;
          source?: TransactionSource;
          status?: TransactionStatus;
          receipt_url?: string | null;
          recurring_rule_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: TransactionType;
          category?: string;
          merchant?: string | null;
          transaction_date?: string;
          source?: TransactionSource;
          status?: TransactionStatus;
          receipt_url?: string | null;
          recurring_rule_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: TransactionType;
          category: string;
          merchant: string | null;
          frequency: RecurringFrequency;
          day_of_month: number | null;
          auto_confirm: boolean;
          is_active: boolean;
          last_run_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: TransactionType;
          category: string;
          merchant?: string | null;
          frequency?: RecurringFrequency;
          day_of_month?: number | null;
          auto_confirm?: boolean;
          is_active?: boolean;
          last_run_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: TransactionType;
          category?: string;
          merchant?: string | null;
          frequency?: RecurringFrequency;
          day_of_month?: number | null;
          auto_confirm?: boolean;
          is_active?: boolean;
          last_run_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      financial_goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          scope: BudgetScope;
          category: string | null;
          limit_amount: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scope: BudgetScope;
          category?: string | null;
          limit_amount: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scope?: BudgetScope;
          category?: string | null;
          limit_amount?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type RecurringRule = Database["public"]["Tables"]["recurring_rules"]["Row"];
export type FinancialGoal = Database["public"]["Tables"]["financial_goals"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
