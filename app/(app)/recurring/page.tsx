import { createClient } from "@/lib/supabase/server";
import type { RecurringRule } from "@/lib/types/database";
import { PageHeader } from "@/components/page-header";
import { RecurringManager } from "@/components/recurring/recurring-manager";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_rules")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Recurring"
        description="Rent, paycheck, subscriptions. Dismiss skips one occurrence; Deactivate cancels the whole series."
      />
      <RecurringManager rules={(data ?? []) as RecurringRule[]} />
    </div>
  );
}
