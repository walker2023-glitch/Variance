"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  categoriesForType,
  type TransactionType,
  UNORGANIZED_CATEGORY,
} from "@/lib/categories";
import { cn, todayISO } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceiptCapture } from "@/components/quick-entry/receipt-capture";
import type { OcrResult } from "@/lib/ocr";

type FormState = {
  amount: string;
  type: TransactionType;
  category: string;
  merchant: string;
  date: string;
  receiptUrl: string | null;
  source: "manual" | "ocr";
};

function emptyState(): FormState {
  return {
    amount: "",
    type: "expense",
    category: "",
    merchant: "",
    date: todayISO(),
    receiptUrl: null,
    source: "manual",
  };
}

export function QuickEntryForm() {
  const [form, setForm] = useState<FormState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () => categoriesForType(form.type),
    [form.type],
  );

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function setType(type: TransactionType) {
    // Reset category when switching type since lists differ.
    update({ type, category: "" });
  }

  function applyOcr(result: OcrResult, receiptUrl: string) {
    setForm({
      amount: result.amount != null ? String(result.amount) : "",
      type: "expense",
      category: result.category ?? UNORGANIZED_CATEGORY,
      merchant: result.merchant ?? "",
      date: result.date ?? todayISO(),
      receiptUrl,
      source: "ocr",
    });
    setNeedsReview(result.needsReview);
    toast.info(
      result.needsReview
        ? "Receipt scanned — please review the details."
        : "Receipt scanned. Check and save.",
    );
    amountRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter an amount greater than 0.");
      amountRef.current?.focus();
      return;
    }
    if (!form.category) {
      toast.error("Pick a category.");
      const firstChip = categoryRef.current?.querySelector("button");
      firstChip?.focus();
      return;
    }

    const payload = {
      amount: Math.round(amountNum * 100) / 100,
      type: form.type,
      category: form.category,
      merchant: form.merchant.trim() || null,
      transaction_date: form.date,
      source: form.source,
      status: "confirmed" as const,
      receipt_url: form.receiptUrl,
    };

    // Optimistic UX: confirm + reset immediately, save in the background.
    setSubmitting(true);
    const savedType = form.type;
    setForm({ ...emptyState(), type: savedType });
    setNeedsReview(false);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        throw new Error(error || "Save failed");
      }
      toast.success("Saved.");
    } catch (err) {
      // Restore what they typed so nothing is lost on a transient failure.
      setForm({
        amount: String(payload.amount),
        type: payload.type,
        category: payload.category,
        merchant: payload.merchant ?? "",
        date: payload.transaction_date,
        receiptUrl: payload.receipt_url,
        source: payload.source,
      });
      toast.error(
        err instanceof Error ? err.message : "Save failed — try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <div
            role="radiogroup"
            aria-label="Transaction type"
            className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1"
          >
            {(["expense", "deposit"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={form.type === t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                  form.type === t
                    ? t === "expense"
                      ? "bg-background text-destructive shadow-sm"
                      : "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                ref={amountRef}
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                autoFocus
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => update({ amount: e.target.value })}
                className="h-16 pl-9 text-3xl font-semibold"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div
              ref={categoryRef}
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Category"
            >
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c}
                  onClick={() => update({ category: c })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    form.category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent",
                  )}
                >
                  {c}
                </button>
              ))}
              {needsReview && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={form.category === UNORGANIZED_CATEGORY}
                  onClick={() => update({ category: UNORGANIZED_CATEGORY })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    form.category === UNORGANIZED_CATEGORY
                      ? "border-warning bg-warning text-warning-foreground"
                      : "border-warning/50 bg-warning/10 text-warning",
                  )}
                >
                  {UNORGANIZED_CATEGORY}
                </button>
              )}
            </div>
          </div>

          {/* Merchant + date (secondary) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant (optional)</Label>
              <Input
                id="merchant"
                value={form.merchant}
                onChange={(e) => update({ merchant: e.target.value })}
                placeholder="e.g. Trader Joe's"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full text-base"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
            <ReceiptCapture onResult={applyOcr} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
