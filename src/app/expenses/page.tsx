"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Header } from "@/components/layout/Header";
import { useCategories, useBudgets, useCashFlow } from "@/hooks/useAnalytics";
import { useUIStore } from "@/store/uiStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";

export default function ExpensesPage() {
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const { data: catData } = useCategories(selectedMonth);
  const { data: budgets = [] } = useBudgets(selectedMonth);
  const { data: cashFlow = [] } = useCashFlow();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const { setImportOpen } = useUIStore();

  const categories = catData?.data ?? [];
  const total = catData?.total ?? 0;

  // Month selector options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <div>
      <Header title="Gastos & Presupuesto" onImport={() => setImportOpen(true)} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Month selector */}
        <div className="flex items-center gap-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            Total gastos: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          </div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setBudgetOpen(true)}>Gestionar presupuestos</Button>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                      {categories.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [formatCurrency(v)]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly bar trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Gastos Mensuales (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashFlow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v), "Gastos"]}
                  />
                  <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Budget progress bars */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Presupuesto vs Gasto</h2>
          {categories.length === 0 && <p className="text-sm text-muted-foreground">Sin transacciones este mes</p>}
          <div className="grid lg:grid-cols-2 gap-3">
            {categories.map((cat) => {
              const budget = budgets.find(b => b.category === cat.category);
              const pct = budget ? Math.min((cat.amount / budget.amount) * 100, 100) : null;
              const over = budget && cat.amount > budget.amount;
              return (
                <div key={cat.category} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm font-medium">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm font-mono font-semibold", over ? "text-red-400" : "text-foreground")}>{formatCurrency(cat.amount)}</span>
                      {budget && <span className="text-xs text-muted-foreground ml-1">/ {formatCurrency(budget.amount)}</span>}
                    </div>
                  </div>
                  {pct !== null && (
                    <Progress value={pct} className="h-1.5" indicatorClassName={over ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-primary"} />
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cat.percentage.toFixed(1)}% del total</span>
                    {over && <Badge variant="loss" className="text-[10px]">+{formatCurrency(cat.amount - (budget?.amount ?? 0))} sobre presupuesto</Badge>}
                    {pct !== null && !over && <span>{pct.toFixed(0)}% del presupuesto</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      <BudgetDialog open={budgetOpen} onClose={() => setBudgetOpen(false)} />
    </div>
  );
}

function BudgetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState("Alimentación");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, amount: parseFloat(amount), period: "monthly" }) });
    qc.invalidateQueries({ queryKey: ["budgets"] });
    setSaving(false);
    setAmount("");
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Gestionar Presupuestos</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Categoría</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Alimentación","Restaurantes","Transporte","Salud","Entretenimiento","Ropa","Hogar","Suministros","Telecomunicaciones","Seguros","Educación","Viajes"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Presupuesto mensual (€)</label>
            <Input type="number" step="0.01" placeholder="300.00" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar presupuesto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
