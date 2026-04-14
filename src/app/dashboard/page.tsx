"use client";
import { Wallet, PiggyBank, TrendingUp, Receipt, Bot, Upload } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { KPICard } from "@/components/dashboard/KPICard";
import { NetWorthChart } from "@/components/dashboard/NetWorthChart";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { useSummary, useNetWorth, useCashFlow } from "@/hooks/useAnalytics";
import { useTransactions } from "@/hooks/useTransactions";
import { useUIStore } from "@/store/uiStore";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";
import { currentMonthLabel } from "@/lib/utils/dates";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const { data: summary } = useSummary();
  const { data: netWorthData = [] } = useNetWorth();
  const { data: cashFlow = [] } = useCashFlow();
  const { data: txData } = useTransactions({ limit: 10 });
  const { setImportOpen } = useUIStore();

  const hasData = (txData?.meta?.total ?? 0) > 0;

  return (
    <div>
      <Header title={`Dashboard — ${currentMonthLabel()}`} onImport={() => setImportOpen(true)} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Empty state */}
        {!hasData && (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">Bienvenido a FinanceAI</p>
              <p className="text-sm text-muted-foreground mt-1">Importa tu primer extracto bancario para empezar a ver tu dashboard</p>
            </div>
            <Button onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> Importar extracto
            </Button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Patrimonio Neto"
            value={formatCurrency(summary?.netWorth ?? 0)}
            change={summary?.netWorthChange}
            changeLabel="vs mes anterior"
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          />
          <KPICard
            title="Tasa de Ahorro"
            value={`${(summary?.savingsRate ?? 0).toFixed(1)}%`}
            change={summary?.savingsRateChange}
            changeLabel="mes anterior"
            icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
            accent={(summary?.savingsRate ?? 0) >= 20 ? "profit" : (summary?.savingsRate ?? 0) < 0 ? "loss" : "neutral"}
          />
          <KPICard
            title="Rentabilidad Cartera"
            value={`${(summary?.portfolioReturn ?? 0).toFixed(1)}%`}
            change={summary?.portfolioReturnChange}
            changeLabel="rentabilidad total"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            accent={(summary?.portfolioReturn ?? 0) >= 0 ? "profit" : "loss"}
          />
          <KPICard
            title="Gastos del Mes"
            value={formatCurrency(summary?.monthlyExpenses ?? 0)}
            change={summary?.monthlyExpensesChange}
            changeLabel="vs mes anterior"
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            accent={(summary?.monthlyExpensesChange ?? 0) <= 0 ? "profit" : "loss"}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <NetWorthChart data={netWorthData} />
          <CashFlowChart data={cashFlow} />
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RecentTransactions transactions={txData?.data ?? []} />
          </div>
          {/* AI Quick Insight */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-accent/5 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <p className="font-semibold">Asesor IA</p>
            </div>
            <p className="text-sm text-muted-foreground flex-1">
              Tu asesor financiero personal analiza tu situación y te da recomendaciones concretas basadas en tus datos reales.
            </p>
            <div className="space-y-2">
              {["¿Cuánto puedo ahorrar este mes?", "¿Está bien diversificada mi cartera?", "Resumen de mi situación financiera"].map((q) => (
                <Link key={q} href={`/advisor?q=${encodeURIComponent(q)}`} className="block rounded-lg border border-border bg-background/50 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                  {q} →
                </Link>
              ))}
            </div>
            <Link href="/advisor">
              <Button size="sm" className="w-full gap-2">
                <Bot className="h-3.5 w-3.5" /> Abrir Asesor
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
