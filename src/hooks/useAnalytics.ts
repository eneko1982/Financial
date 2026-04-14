import { useQuery } from "@tanstack/react-query";
import type { KPIData, NetWorthPoint, CashFlowPoint, CategorySpend } from "@/types/financial";

export function useSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/summary");
      const json = await res.json();
      return json.data as KPIData;
    },
  });
}

export function useNetWorth() {
  return useQuery({
    queryKey: ["analytics", "net-worth"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/net-worth");
      const json = await res.json();
      return json.data as NetWorthPoint[];
    },
  });
}

export function useCashFlow() {
  return useQuery({
    queryKey: ["analytics", "cashflow"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/cashflow");
      const json = await res.json();
      return json.data as CashFlowPoint[];
    },
  });
}

export function useCategories(month?: string, type: "expense" | "income" = "expense", accountId?: string) {
  return useQuery({
    queryKey: ["analytics", "categories", month, type, accountId],
    queryFn: async () => {
      const params = new URLSearchParams({ type });
      if (month) params.set("month", month);
      if (accountId) params.set("accountId", accountId);
      const res = await fetch(`/api/analytics/categories?${params}`);
      const json = await res.json();
      return { data: json.data as CategorySpend[], total: json.meta?.total ?? 0 };
    },
  });
}

export function useBudgets(month?: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: async () => {
      const url = month ? `/api/budgets?month=${month}` : "/api/budgets";
      const res = await fetch(url);
      const json = await res.json();
      return json.data as Array<{ id: string; category: string; amount: number; color: string | null; spent: number; percent: number }>;
    },
  });
}

export function useInvestmentPositions() {
  return useQuery({
    queryKey: ["investments", "positions"],
    queryFn: async () => {
      const res = await fetch("/api/investments/positions");
      const json = await res.json();
      return { data: json.data, totalValue: json.meta?.totalValue ?? 0 } as {
        data: Array<{ id: string; ticker: string; name: string; shares: number; averageCost: number; currentPrice: number | null; currentValue: number; costBasis: number; pnlEur: number; pnlPct: number; weight: number; assetClass: string | null; account: { name: string; broker: string } }>;
        totalValue: number;
      };
    },
  });
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: ["savings-goals"],
    queryFn: async () => {
      const res = await fetch("/api/savings-goals");
      const json = await res.json();
      return json.data as Array<{ id: string; name: string; targetAmount: number; currentAmount: number; targetDate: string | null; category: string | null; color: string | null; icon: string | null; progress: number; isCompleted: boolean }>;
    },
  });
}
