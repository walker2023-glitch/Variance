import { createClient } from "@/lib/supabase/server";
import { UNORGANIZED_CATEGORY } from "@/lib/categories";
import type { Transaction } from "@/lib/types/database";
import { PageHeader } from "@/components/page-header";
import { UnorganizedList } from "@/components/unorganized/unorganized-list";

export const dynamic = "force-dynamic";

export default async function UnorganizedPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("category", UNORGANIZED_CATEGORY)
    .order("transaction_date", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Unorganized"
        description="Receipts OCR couldn't confidently categorize. Pick a real category to move them into analytics."
      />
      <UnorganizedList items={(data ?? []) as Transaction[]} />
    </div>
  );
}
