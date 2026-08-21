"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { Budget, BudgetScope } from "@/lib/types/database";
import type { BudgetProgress } from "@/lib/spend";
import { jsonFetch } from "@/lib/api-client";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { budgetTone } from "@/lib/spend";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BudgetManager({
  budgets,
  progress,
}: {
  budgets: Budget[];
  progress: BudgetProgress[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [scope, setScope] = useState<BudgetScope>("weekly_total");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);

  const weekly = progress.filter((p) => p.scope === "weekly_total");
  const perCategory = progress.filter((p) => p.scope === "category");
  const hasWeekly = budgets.some((b) => b.scope === "weekly_total" && b.is_active);

  function openCreate() {
    setEditing(null);
    setScope(hasWeekly ? "category" : "weekly_total");
    setCategory(EXPENSE_CATEGORIES[0]);
    setLimit("");
    setOpen(true);
  }

  function openEdit(b: Budget) {
    setEditing(b);
    setScope(b.scope);
    setCategory(b.category ?? EXPENSE_CATEGORIES[0]);
    setLimit(String(b.limit_amount));
    setOpen(true);
  }

  async function save() {
    const limit_amount = Number(limit);
    if (!limit || Number.isNaN(limit_amount) || limit_amount <= 0) {
      toast.error("Enter a limit greater than 0.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await jsonFetch(`/api/budgets/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ limit_amount }),
        });
        toast.success("Limit updated.");
      } else {
        await jsonFetch("/api/budgets", {
          method: "POST",
          body: JSON.stringify({
            scope,
            category: scope === "category" ? category : null,
            limit_amount,
          }),
        });
        toast.success("Limit created.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: Budget) {
    if (!confirm("Delete this spending limit?")) return;
    try {
      await jsonFetch(`/api/budgets/${b.id}`, { method: "DELETE" });
      toast.success("Limit deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New limit
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState
          title="No spending limits yet"
          description="Set a weekly total and/or per-category caps. They're dashboard indicators only — they never block an entry."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Set a limit
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {weekly.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                This week
              </h2>
              {weekly.map((b) => (
                <LimitCard key={b.id} row={b} onEdit={openEdit} onDelete={remove} />
              ))}
            </section>
          )}
          {perCategory.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                This month by category
              </h2>
              {perCategory.map((b) => (
                <LimitCard key={b.id} row={b} onEdit={openEdit} onDelete={remove} />
              ))}
            </section>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit limit" : "New spending limit"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="b-scope">Scope</Label>
                <select
                  id="b-scope"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as BudgetScope)}
                >
                  <option value="weekly_total">Weekly total</option>
                  <option value="category">Per category (this month)</option>
                </select>
              </div>
            )}
            {!editing && scope === "category" && (
              <div className="space-y-1.5">
                <Label htmlFor="b-cat">Category</Label>
                <select
                  id="b-cat"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="b-limit">Limit amount</Label>
              <Input
                id="b-limit"
                type="number"
                step="0.01"
                min="0"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LimitCard({
  row,
  onEdit,
  onDelete,
}: {
  row: BudgetProgress;
  onEdit: (b: Budget) => void;
  onDelete: (b: Budget) => void;
}) {
  const tone = budgetTone(row.percent);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">
              {row.scope === "weekly_total" ? "Weekly total" : row.category}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(row.spent)} of {formatCurrency(row.limit_amount)}
              {row.remaining >= 0
                ? ` · ${formatCurrency(row.remaining)} left`
                : ` · ${formatCurrency(Math.abs(row.remaining))} over`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tone === "warn" && <Badge variant="warning">≥80%</Badge>}
            {tone === "over" && <Badge variant="over">Over</Badge>}
            <Button size="sm" variant="ghost" onClick={() => onEdit(row)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(row)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Progress
          value={row.percent}
          indicatorClassName={
            tone === "over"
              ? "bg-over"
              : tone === "warn"
                ? "bg-warning"
                : "bg-primary"
          }
        />
      </CardContent>
    </Card>
  );
}
