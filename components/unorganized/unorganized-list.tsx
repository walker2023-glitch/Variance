"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Transaction } from "@/lib/types/database";
import { jsonFetch } from "@/lib/api-client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function UnorganizedList({ items }: { items: Transaction[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, string>>({});

  async function recategorize(t: Transaction) {
    const category = picks[t.id];
    if (!category) {
      toast.error("Pick a category first.");
      return;
    }
    setBusyId(t.id);
    try {
      await jsonFetch(`/api/transactions/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ category }),
      });
      toast.success("Recategorized.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing to sort"
        description="Receipts the OCR isn't sure about land here. You're all caught up."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((t) => {
        const cats = t.type === "deposit" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        return (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {formatCurrency(t.amount)}
                  {t.merchant ? (
                    <span className="text-muted-foreground"> · {t.merchant}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.transaction_date} · {t.source}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`New category for ${t.merchant || t.amount}`}
                  className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={picks[t.id] ?? ""}
                  onChange={(e) =>
                    setPicks((p) => ({ ...p, [t.id]: e.target.value }))
                  }
                >
                  <option value="">Pick a category…</option>
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={busyId === t.id}
                  onClick={() => recategorize(t)}
                >
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
