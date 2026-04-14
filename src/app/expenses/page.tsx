"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Header } from "@/components/layout/Header";
import { useCategories, useBudgets, useCashFlow } from "@/hooks/useAnalytics";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
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
import { CategoryEditor } from "@/components/transactions/CategoryEditor";

type ViewType = "expense" | "income";

const CATEGORY_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#8b5cf6","#ec4899","#6b7280","#06b6d4","#84cc16","#f59e0b"];

export default function ExpensesPage() {
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const [view, setView] = useState<ViewType>("expense");
  const [accountId, setAccountId] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const { setImportOpen } = useUIStore();

  const { data: accounts = [] } = useAccounts();
  const { data: catData } = useCategories(selectedMonth, view, accountId || undefined);
  const { data: budgets = [] } = useBudgets(selectedMonth);
  const { data: cashFlow = [] } = useCashFlow();

  const { data: txData } = useTransactions({
    accountId: accountId || undefined,
    page: txPage,
    limit: 20,
    // filter by month: add start/end via the hook (will need route to support)
  });

  const categories = catData?.data ?? [];
  const total = catData?.total ?? 0;

  const monthOptions = Array.from({ length: 18 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return { val, label };
  });

  // Filter transactions to the selected month
  const monthTxs = (txData?.data ?? []).filter((tx) => {
    const txMonth = new Date(tx.date).toISOString().slice(0, 7);
    return txMonth === selectedMonth;
  }).filter((tx) => view === "income" ? tx.amount > 0 : tx.amount < 0);

  return (
    <div>
      <Header title="Gastos & Ingresos" onImport={() => setImportOpen(true)} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gastos / Ingresos toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("expense")}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", view === "expense" ? "bg-red-500/20 text-red-400 border-r border-border" : "text-muted-foreground hover:bg-muted/50 border-r border-border")}
            >
              Gastos
            </button>
            <button
              onClick={() => setView("income")}
              className={cn("px-4 py-2 text-sm font-medium transition-colors", view === "income" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:bg-muted/50")}
            >
              Ingresos
            </button>
          </div>

          {/* Month */}
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setTxPage(1); }}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Account filter */}
          <Select value={accountId || "all"} onValueChange={v => { setAccountId(v === "all" ? "" : v); setTxPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todas las cuentas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las cuentas</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="text-sm text-muted-foreground">
            Total {view === "expense" ? "gastos" : "ingresos"}:{" "}
            <span className={cn("font-semibold", view === "expense" ? "text-red-400" : "text-emerald-400")}>
              {formatCurrency(total)}
            </span>
          </div>

          {view === "expense" && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setBudgetOpen(true)}>Gestionar presupuestos</Button>
          )}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Distribución por Categoría
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin datos este mes</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                      {categories.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {view === "expense" ? "Gastos" : "Ingresos"} Mensuales (6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cashFlow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v)]} />
                  {view === "expense"
                    ? <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4,4,0,0]} maxBarSize={32} name="Gastos" />
                    : <Bar dataKey="income" fill="hsl(142 76% 36%)" radius={[4,4,0,0]} maxBarSize={32} name="Ingresos" />
                  }
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Budget bars (expenses only) */}
        {view === "expense" && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Presupuesto vs Gasto</h2>
            {categories.length === 0 && <p className="text-sm text-muted-foreground">Sin transacciones este mes</p>}
            <div className="grid lg:grid-cols-2 gap-3">
              {categories.map((cat, i) => {
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                const budget = budgets.find(b => b.category === cat.category);
                const pct = budget ? Math.min((cat.amount / budget.amount) * 100, 100) : null;
                const over = budget && cat.amount > budget.amount;
                return (
                  <div key={cat.category} className="rounded-lg border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: color }} />
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction list for selected month */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Movimientos — {monthOptions.find(m => m.val === selectedMonth)?.label}
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                </tr>
              </thead>
              <tbody>
                {monthTxs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay movimientos</td></tr>
                )}
                {monthTxs.map(tx => (
                  <tr key={tx.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-3 max-w-[240px] truncate font-medium">{tx.description}</td>
                    <td className="px-4 py-3">
                      <CategoryEditor
                        transactionId={tx.id}
                        currentCategory={tx.category ?? null}
                        extraInvalidate={[["analytics", "categories"]]}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tx.account?.name}</td>
                    <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(txData?.meta?.total ?? 0) > 20 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={txPage * 20 >= (txData?.meta?.total ?? 0)} onClick={() => setTxPage(p => p + 1)}>Siguiente</Button>
            </div>
          )}
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
