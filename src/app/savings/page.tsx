"use client";
import { useState } from "react";
import { Target, Plus, Edit2, Trash2, Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useSavingsGoals } from "@/hooks/useAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";
import { calcMonthsToGoal } from "@/lib/utils/calculations";

const GOAL_ICONS: Record<string, string> = {
  emergency: "🛡️", travel: "✈️", purchase: "🏠", retirement: "🌅", education: "📚", other: "🎯",
};

const GOAL_COLORS: Record<string, string> = {
  emergency: "#22c55e", travel: "#3b82f6", purchase: "#f59e0b", retirement: "#a855f7", education: "#06b6d4", other: "#6366f1",
};

export default function SavingsPage() {
  const { data: goals = [] } = useSavingsGoals();
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  async function markComplete(id: string) {
    await fetch(`/api/savings-goals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: true }) });
    qc.invalidateQueries({ queryKey: ["savings-goals"] });
  }

  async function deleteGoal(id: string) {
    await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["savings-goals"] });
  }

  return (
    <div>
      <Header title="Objetivos de Ahorro" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total ahorrado</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-emerald-400">{formatCurrency(totalSaved)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total objetivos</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(totalTarget)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progreso global</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}%</p>
          </CardContent></Card>
        </div>

        {/* Add button */}
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Nuevo objetivo</Button>
        </div>

        {/* Goal cards */}
        {goals.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center space-y-3">
            <Target className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">Sin objetivos de ahorro</p>
            <p className="text-sm text-muted-foreground">Crea tu primer objetivo para empezar a planificar tu ahorro</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline">Crear objetivo</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const color = GOAL_COLORS[goal.category ?? "other"];
              const icon = GOAL_ICONS[goal.category ?? "other"];
              const remaining = goal.targetAmount - goal.currentAmount;
              const monthsLeft = goal.targetDate
                ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
                : null;
              const monthlyNeeded = monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null;

              return (
                <Card key={goal.id} className={cn("relative", goal.isCompleted && "opacity-60")}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${color}20` }}>
                          {icon}
                        </div>
                        <div>
                          <p className="font-semibold">{goal.name}</p>
                          {goal.targetDate && (
                            <p className="text-xs text-muted-foreground">Objetivo: {new Date(goal.targetDate).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!goal.isCompleted && <button onClick={() => markComplete(goal.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-emerald-400 transition-colors" title="Marcar completado"><Check className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => deleteGoal(goal.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-mono tabular-nums font-semibold" style={{ color }}>{formatCurrency(goal.currentAmount)}</span>
                        <span className="text-muted-foreground font-mono tabular-nums">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <Progress value={goal.progress} className="h-2" indicatorClassName="" style={{ "--progress-color": color } as React.CSSProperties} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{goal.progress.toFixed(0)}% completado</span>
                        <span>{formatCurrency(remaining)} restante</span>
                      </div>
                    </div>

                    {monthlyNeeded !== null && (
                      <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        Para llegar a tiempo: <span className="font-semibold text-foreground">{formatCurrency(monthlyNeeded)}/mes</span>
                        {monthsLeft !== null && <span className="ml-1">({monthsLeft} meses)</span>}
                      </div>
                    )}

                    {goal.isCompleted && <Badge variant="profit" className="w-full justify-center">¡Objetivo alcanzado!</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <CreateGoalDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateGoalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "0", targetDate: "", category: "other", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount || "0"), targetDate: form.targetDate || null }),
    });
    qc.invalidateQueries({ queryKey: ["savings-goals"] });
    setSaving(false);
    onClose();
    setForm({ name: "", targetAmount: "", currentAmount: "0", targetDate: "", category: "other", description: "" });
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo Objetivo de Ahorro</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre del objetivo</label>
            <Input placeholder="Fondo de emergencia" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoría</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">🛡️ Emergencia</SelectItem>
                  <SelectItem value="travel">✈️ Viajes</SelectItem>
                  <SelectItem value="purchase">🏠 Compra</SelectItem>
                  <SelectItem value="retirement">🌅 Jubilación</SelectItem>
                  <SelectItem value="education">📚 Educación</SelectItem>
                  <SelectItem value="other">🎯 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha objetivo</label>
              <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Objetivo (€)</label>
              <Input type="number" step="0.01" placeholder="10000" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ahorrado hoy (€)</label>
              <Input type="number" step="0.01" placeholder="0" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear objetivo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
