"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Transaction } from "@/lib/types/database";
import { jsonFetch } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { categoriesForType } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * "Needs Confirmation" banner (FR-16, FR-17).
 * Confirm = status confirmed. Dismiss = delete this occurrence only.
 * Edit = tweak fields then confirm.
 */
export function NeedsConfirmation({
  pending,
}: {
  pending: Transaction[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  async function confirm(id: string, patch?: Partial<Transaction>) {
    setBusyId(id);
    try {
      await jsonFetch(`/api/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "confirmed", ...patch }),
      });
      toast.success("Confirmed.");
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await jsonFetch(`/api/transactions/${id}`, { method: "DELETE" });
      toast.success("Skipped this occurrence. The rule is still active.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card className="border-accent/30 bg-accent/5 shadow-sm">
        <CardHeader className="pb-3">
          <p className="label-caps text-accent-foreground/80">Needs attention</p>
          <CardTitle className="font-display text-base font-semibold">
            Confirm recurring ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {formatCurrency(t.amount)}{" "}
                  <span className="text-muted-foreground">
                    · {t.category}
                    {t.merchant ? ` · ${t.merchant}` : ""}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.transaction_date} · {t.type}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => confirm(t.id)}
                  disabled={busyId === t.id}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(t)}
                  disabled={busyId === t.id}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => dismiss(t.id)}
                  disabled={busyId === t.id}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <EditPendingDialog
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && confirm(editing.id, patch)}
        busy={editing != null && busyId === editing.id}
      />
    </>
  );
}

function EditPendingDialog({
  transaction,
  onClose,
  onSave,
  busy,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (patch: {
    amount: number;
    category: string;
    merchant: string | null;
    transaction_date: string;
  }) => void;
  busy: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (!transaction) return;
    setAmount(String(transaction.amount));
    setCategory(transaction.category);
    setMerchant(transaction.merchant ?? "");
    setDate(transaction.transaction_date);
  }, [transaction]);

  const categories = transaction
    ? categoriesForType(transaction.type)
    : [];

  return (
    <Dialog open={!!transaction} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit before confirming</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-category">Category</Label>
            <select
              id="edit-category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-merchant">Merchant</Label>
            <Input
              id="edit-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Date</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              onSave({
                amount: Number(amount),
                category,
                merchant: merchant.trim() || null,
                transaction_date: date,
              })
            }
          >
            Save & confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
