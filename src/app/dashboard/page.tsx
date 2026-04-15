"use client";
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useSummary } from "@/hooks/useAnalytics";
import { useTransactions } from "@/hooks/useTransactions";
import { useUIStore } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Corriente",
  savings: "Ahorro",
  credit: "Crédito",
  epsv: "EPSV",
  investment: "Inversión",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  checking: "bg-blue-400/20 text-blue-300",
  savings: "bg-emerald-400/20 text-emerald-300",
  credit: "bg-red-400/20 text-red-300",
  epsv: "bg-violet-400/20 text-violet-300",
  investment: "bg-amber-400/20 text-amber-300",
};

const ACCOUNT_BORDER_COLORS: Record<string, string> = {
  checking: "border-l-blue-400",
  savings: "border-l-emerald-400",
  credit: "border-l-red-400",
  epsv: "border-l-violet-400",
  investment: "border-l-amber-400",
};

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

export default function DashboardPage() {
  const { selectedMonth, setSelectedMonth } = useUIStore();
  const { data: accounts = [] } = useAccounts();
  const { data: summary } = useSummary();
  const { data: txData } = useTransactions({ limit: 6 });

  const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
  const recentTxs = txData?.data ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Dark gradient header */}
      <div className="bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 px-5 pt-12 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Inicio</h1>
          {/* Month selector */}
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-0.5">
            <button
              onClick={() => setSelectedMonth(addMonth(selectedMonth, -1))}
              className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
            <span className="text-xs font-medium text-white/90 capitalize min-w-[110px] text-center">
              {monthLabel(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(addMonth(selectedMonth, 1))}
              className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Patrimonio */}
          <div className="rounded-xl bg-white/10 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-white/60" />
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Patrimonio</span>
            </div>
            <p className="text-base font-bold text-white leading-tight">{formatCurrency(totalAssets)}</p>
          </div>
          {/* Ingresos */}
          <div className="rounded-xl bg-emerald-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-300/80 font-medium uppercase tracking-wider">Ingresos</span>
            </div>
            <p className="text-base font-bold text-emerald-300 leading-tight">{formatCurrency(summary?.monthlyIncome ?? 0)}</p>
          </div>
          {/* Gastos */}
          <div className="rounded-xl bg-red-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              <span className="text-[10px] text-red-300/80 font-medium uppercase tracking-wider">Gastos</span>
            </div>
            <p className="text-base font-bold text-red-300 leading-tight">{formatCurrency(Math.abs(summary?.monthlyExpenses ?? 0))}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Accounts section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Mis cuentas</h2>
            <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay cuentas aún</p>
              </div>
            ) : (
              accounts.map(account => (
                <div
                  key={account.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-border bg-card p-4 border-l-4",
                    ACCOUNT_BORDER_COLORS[account.type] ?? "border-l-muted"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{account.name}</p>
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        ACCOUNT_TYPE_COLORS[account.type] ?? "bg-muted text-muted-foreground"
                      )}>
                        {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{account.bank}</p>
                  </div>
                  <p className={cn(
                    "text-base font-bold shrink-0 ml-3",
                    account.balance >= 0 ? "text-foreground" : "text-red-400"
                  )}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent transactions section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Últimos movimientos</h2>
            <Link href="/accounts" className="text-xs text-primary font-medium hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {recentTxs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Sin movimientos recientes
              </div>
            ) : (
              recentTxs.map((tx, i) => (
                <div
                  key={tx.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i < recentTxs.length - 1 && "border-b border-border"
                  )}
                >
                  {/* Amount indicator */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    tx.amount >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"
                  )}>
                    {tx.amount >= 0
                      ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                      : <TrendingDown className="h-4 w-4 text-red-400" />
                    }
                  </div>

                  {/* Description + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                      {tx.category && (
                        <>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
                            {tx.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <p className={cn(
                    "text-sm font-semibold shrink-0",
                    tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
