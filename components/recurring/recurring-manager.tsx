"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { RecurringFrequency, RecurringRule, TransactionType } from "@/lib/types/database";
import { jsonFetch } from "@/lib/api-client";
import { categoriesForType } from "@/lib/categories";
import { WEEKDAYS, weekdayLabel } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RuleForm = {
  amount: string;
  type: TransactionType;
  category: string;
  merchant: string;
  frequency: RecurringFrequency;
  day_of_month: number;
  auto_confirm: boolean;
};

function defaultForm(): RuleForm {
  return {
    amount: "",
    type: "expense",
    category: "Rent/Mortgage",
    merchant: "",
    frequency: "monthly",
    day_of_month: 1,
    auto_confirm: false,
  };
}

function fromRule(r: RecurringRule): RuleForm {
  return {
    amount: String(r.amount),
    type: r.type,
    category: r.category,
    merchant: r.merchant ?? "",
    frequency: r.frequency,
    day_of_month: r.day_of_month ?? (r.frequency === "monthly" ? 1 : 0),
    auto_confirm: r.auto_confirm,
  };
}

export function RecurringManager({ rules }: { rules: RecurringRule[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm());
    setOpen(true);
  }

  function openEdit(r: RecurringRule) {
    setEditing(r);
    setForm(fromRule(r));
    setOpen(true);
  }

  async function save() {
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    const payload = {
      amount,
      type: form.type,
      category: form.category,
      merchant: form.merchant.trim() || null,
      frequency: form.frequency,
      day_of_month: form.day_of_month,
      auto_confirm: form.auto_confirm,
    };
    try {
      if (editing) {
        await jsonFetch(`/api/recurring-rules/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Rule updated.");
      } else {
        await jsonFetch("/api/recurring-rules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Rule created.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(r: RecurringRule) {
    try {
      await jsonFetch(`/api/recurring-rules/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !r.is_active }),
      });
      toast.success(r.is_active ? "Series deactivated." : "Series reactivated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function remove(r: RecurringRule) {
    if (!confirm("Delete this rule? Past transactions stay; no future ones will be generated.")) {
      return;
    }
    try {
      await jsonFetch(`/api/recurring-rules/${r.id}`, { method: "DELETE" });
      toast.success("Rule deleted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const categories = useMemo(
    () => categoriesForType(form.type),
    [form.type],
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          title="No recurring rules yet"
          description="Add rent, paycheck, or subscriptions so they show up automatically."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create a rule
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} className={!r.is_active ? "opacity-60" : undefined}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {formatCurrency(r.amount)}{" "}
                    <span className="text-muted-foreground">
                      · {r.category}
                      {r.merchant ? ` · ${r.merchant}` : ""}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.frequency === "monthly"
                      ? `Monthly on day ${r.day_of_month}`
                      : `${r.frequency === "biweekly" ? "Every 2 weeks" : "Weekly"} on ${weekdayLabel(r.day_of_month)}`}
                    {r.auto_confirm ? " · auto-confirms" : " · needs confirmation"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.is_active ? "success" : "secondary"}>
                    {r.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deactivate(r)}>
                    {r.is_active ? "Deactivate" : "Reactivate"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rule" : "New recurring rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-amount">Amount</Label>
                <Input
                  id="r-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-type">Type</Label>
                <select
                  id="r-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value as TransactionType;
                    const cats = categoriesForType(type);
                    setForm({
                      ...form,
                      type,
                      category: cats.includes(form.category) ? form.category : cats[0],
                    });
                  }}
                >
                  <option value="expense">Expense</option>
                  <option value="deposit">Deposit</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-category">Category</Label>
              <select
                id="r-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-merchant">Merchant (optional)</Label>
              <Input
                id="r-merchant"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-freq">Frequency</Label>
                <select
                  id="r-freq"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.frequency}
                  onChange={(e) => {
                    const frequency = e.target.value as RecurringFrequency;
                    setForm({
                      ...form,
                      frequency,
                      day_of_month: frequency === "monthly" ? 1 : 0,
                    });
                  }}
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                </select>
              </div>
              {form.frequency === "monthly" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="r-dom">Day of month</Label>
                  <Input
                    id="r-dom"
                    type="number"
                    min={1}
                    max={31}
                    value={form.day_of_month}
                    onChange={(e) =>
                      setForm({ ...form, day_of_month: Number(e.target.value) })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="r-dow">Weekday</Label>
                  <select
                    id="r-dow"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.day_of_month}
                    onChange={(e) =>
                      setForm({ ...form, day_of_month: Number(e.target.value) })
                    }
                  >
                    {WEEKDAYS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.auto_confirm}
                onChange={(e) =>
                  setForm({ ...form, auto_confirm: e.target.checked })
                }
              />
              Auto-confirm (skip the banner; post straight to the ledger)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {editing ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
