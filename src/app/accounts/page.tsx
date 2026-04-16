"use client";
import { useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PenLine, Trash2,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
} from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore, type EditTxData } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function addMonth(ym: string, delta: number) {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const label = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MovimientosPage() {
  const { selectedMonth, setSelectedMonth, setEditTx } = useUIStore();
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [deleteTxPending, setDeleteTxPending] = useState(false);
  const qc = useQueryClient();

  // Date range derived from selectedMonth
  const [ymYear, ymMonth] = selectedMonth.split("-").map(Number);
  const dateFrom = `${selectedMonth}-01`;
  const dateTo = new Date(ymYear, ymMonth, 0).toISOString().slice(0, 10);

  const { data: txData, isLoading } = useTransactions({
    accountId: accountId || undefined,
    page,
    limit: 60,
    dateFrom,
    dateTo,
  });

  const rows = txData?.data ?? [];
  const total = txData?.meta?.total ?? 0;

  // Income / expense summary for the month
  const monthIncome   = rows.filter(t => t.amount > 0 && !t.isTransfer).reduce((s, t) => s + t.amount, 0);
  const monthExpenses = rows.filter(t => t.amount < 0 && !t.isTransfer).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Group by date key YYYY-MM-DD
  const grouped: { key: string; label: string; txs: typeof rows; sum: number }[] = [];
  const seen = new Map<string, number>();
  for (const tx of rows) {
    const key = new Date(tx.date).toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.set(key, grouped.length);
      grouped.push({ key, label: dayLabel(key), txs: [], sum: 0 });
    }
    const idx = seen.get(key)!;
    grouped[idx].txs.push(tx);
    grouped[idx].sum += tx.amount;
  }

  async function handleDelete() {
    if (!deleteTxId) return;
    setDeleteTxPending(true);
    try {
      await fetch(`/api/transactions/${deleteTxId}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    } finally {
      setDeleteTxPending(false);
      setDeleteTxId(null);
    }
  }

  function handleMonthChange(delta: number) {
    setSelectedMonth(addMonth(selectedMonth, delta));
    setPage(1);
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Gradient header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 px-5 pt-12 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Movimientos</h1>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-0.5">
            <button
              onClick={() => handleMonthChange(-1)}
              className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
            <span className="text-xs font-medium text-white/90 capitalize min-w-[110px] text-center">
              {monthLabel(selectedMonth)}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-300/80 font-medium uppercase tracking-wider">Ingresos</span>
            </div>
            <p className="text-base font-bold text-emerald-300 leading-tight">{formatCurrency(monthIncome)}</p>
          </div>
          <div className="rounded-xl bg-orange-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-[10px] text-orange-300/80 font-medium uppercase tracking-wider">Gastos</span>
            </div>
            <p className="text-base font-bold text-orange-300 leading-tight">{formatCurrency(monthExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5">
        <Select value={accountId || "all"} onValueChange={v => { setAccountId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-full sm:w-56 text-sm">
            <SelectValue placeholder="Todas las cuentas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cuentas</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Sin movimientos en {monthLabel(selectedMonth)}
          </div>
        ) : (
          grouped.map(({ key, label, txs, sum }) => (
            <section key={key}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                <span className={cn("text-xs font-mono font-semibold tabular-nums", sum >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {sum >= 0 ? "+" : ""}{formatCurrency(sum)}
                </span>
              </div>

              {/* Transaction cards */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {txs.map((tx, i) => (
                  <div
                    key={tx.id}
                    className={cn("group flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors", i < txs.length - 1 && "border-b border-border")}
                  >
                    {/* Icon */}
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      tx.isTransfer ? "bg-blue-400/10" : tx.amount >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"
                    )}>
                      {tx.isTransfer
                        ? <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                        : tx.amount >= 0
                          ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          : <ArrowDownLeft className="h-4 w-4 text-red-400" />}
                    </div>

                    {/* Description + date */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate", tx.isTransfer ? "text-blue-400" : tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                        {tx.description || (tx.isTransfer ? "Transferencia" : tx.amount >= 0 ? "Ingreso" : "Gasto")}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(tx.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        {tx.category ? ` · ${tx.category}` : ""}
                        {tx.subcategory ? ` · ${tx.subcategory}` : ""}
                      </p>
                    </div>

                    {/* Amount + account */}
                    <div className="text-right shrink-0 max-w-[130px]">
                      <p className={cn("text-sm font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                        {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                      </p>
                      {!accountId && tx.account?.name && (
                        <p className="text-[10px] text-muted-foreground/60 truncate">{tx.account.name}</p>
                      )}
                    </div>

                    {/* Row actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => setEditTx({ id: tx.id, amount: tx.amount, description: tx.description, date: tx.date, accountId: tx.accountId, category: tx.category ?? null, subcategory: tx.subcategory ?? null, notes: tx.notes ?? null, isTransfer: tx.isTransfer ?? false } as EditTxData)}
                        className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        title="Editar"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTxId(tx.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* Pagination */}
        {total > 60 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {Math.ceil(total / 60)}</span>
            <Button variant="outline" size="sm" disabled={page * 60 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar movimiento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTxId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteTxPending} onClick={handleDelete}>
              {deleteTxPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
