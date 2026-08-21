"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { FinancialGoal } from "@/lib/types/database";
import { jsonFetch } from "@/lib/api-client";
import { asNumber, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
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

type GoalForm = {
  title: string;
  target_amount: string;
  current_amount: string;
  target_date: string;
};

function emptyForm(): GoalForm {
  return { title: "", target_amount: "", current_amount: "0", target_date: "" };
}

export function GoalManager({ goals }: { goals: FinancialGoal[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialGoal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(g: FinancialGoal) {
    setEditing(g);
    setForm({
      title: g.title,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      target_date: g.target_date ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const target_amount = Number(form.target_amount);
    const current_amount = Number(form.current_amount || 0);
    if (!form.title.trim()) {
      toast.error("Give the goal a title.");
      return;
    }
    if (!form.target_amount || Number.isNaN(target_amount) || target_amount <= 0) {
      toast.error("Enter a target greater than 0.");
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      target_amount,
      current_amount,
      target_date: form.target_date || null,
    };
    try {
      if (editing) {
        await jsonFetch(`/api/goals/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Goal updated.");
      } else {
        await jsonFetch("/api/goals", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Goal created.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(g: FinancialGoal) {
    if (!confirm(`Delete “${g.title}”?`)) return;
    try {
      await jsonFetch(`/api/goals/${g.id}`, { method: "DELETE" });
      toast.success("Goal deleted.");
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
          New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set a savings target and update progress manually as you go. Auto-accrual from deposits is a v1.1 idea."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create a goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const current = asNumber(g.current_amount);
            const target = asNumber(g.target_amount);
            const percent = target > 0 ? (current / target) * 100 : 0;
            return (
              <Card key={g.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(current)} of {formatCurrency(target)}
                        {g.target_date ? ` · by ${g.target_date}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(g)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={percent} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-title">Title</Label>
              <Input
                id="g-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Emergency fund"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-target">Target</Label>
                <Input
                  id="g-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.target_amount}
                  onChange={(e) =>
                    setForm({ ...form, target_amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-current">Current (manual)</Label>
                <Input
                  id="g-current"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.current_amount}
                  onChange={(e) =>
                    setForm({ ...form, current_amount: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-date">Target date (optional)</Label>
              <Input
                id="g-date"
                type="date"
                value={form.target_date}
                onChange={(e) =>
                  setForm({ ...form, target_date: e.target.value })
                }
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
