import { prisma } from "./prisma";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { es } from "date-fns/locale";
import type { FinancialContext } from "@/types/financial";
import { calcSavingsRate, calcTotalReturn, calcGoalProgress, isInternalTransfer } from "./utils/calculations";

// ── In-memory cache (TTL: 5 minutes) ────────────────────────────────────────
// Safe for single-user personal finance app.
let _ctxCache: { ctx: FinancialContext; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateFinancialContext() {
  _ctxCache = null;
}

export async function getFinancialContext(): Promise<FinancialContext> {
  const now = Date.now();
  if (_ctxCache && _ctxCache.expiresAt > now) return _ctxCache.ctx;
  const ctx = await buildFinancialContext();
  _ctxCache = { ctx, expiresAt: now + CACHE_TTL_MS };
  return ctx;
}

export async function buildFinancialContext(): Promise<FinancialContext> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  // ── Accounts with latest balances ──────────────────────────────────────────
  // 3-priority logic, N+1 eliminated with bulk queries:
  // 1) Manual AccountBalance snapshot, 2) last tx.balance (Disponible/Saldo), 3) tx sum
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  const accountIds = accounts.map(a => a.id);

  const snapshots = accountIds.length > 0
    ? await prisma.accountBalance.findMany({
        where: { accountId: { in: accountIds } },
        orderBy: { date: "desc" },
        distinct: ["accountId"],
        select: { accountId: true, balance: true },
      })
    : [];
  const snapshotMap = new Map(snapshots.map(s => [s.accountId, s.balance]));

  const needsBalanceTx = accountIds.filter(id => !snapshotMap.has(id));
  const lastTxBalances = needsBalanceTx.length > 0
    ? await prisma.transaction.findMany({
        where: { accountId: { in: needsBalanceTx }, balance: { not: null } },
        orderBy: { date: "desc" },
        distinct: ["accountId"],
        select: { accountId: true, balance: true },
      })
    : [];
  const lastTxBalanceMap = new Map(lastTxBalances.map(t => [t.accountId, t.balance as number]));

  const needsSum = needsBalanceTx.filter(id => !lastTxBalanceMap.has(id));
  const txSums = needsSum.length > 0
    ? await prisma.transaction.groupBy({
        by: ["accountId"],
        where: { accountId: { in: needsSum } },
        _sum: { amount: true },
      })
    : [];
  const txSumMap = new Map(txSums.map(s => [s.accountId, s._sum.amount ?? 0]));

  const accountsWithBalance = accounts.map(acc => ({
    ...acc,
    balance: snapshotMap.get(acc.id) ?? lastTxBalanceMap.get(acc.id) ?? txSumMap.get(acc.id) ?? 0,
  }));
  const totalBankAssets = accountsWithBalance.reduce((s, a) => s + a.balance, 0);

  // ── Investment portfolio ────────────────────────────────────────────────────
  const positions = await prisma.investmentPosition.findMany({ include: { account: true } });
  const portfolioCost  = positions.reduce((s, p) => s + p.shares * p.averageCost, 0);
  const portfolioValue = positions.reduce((s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0);
  const totalReturnEur = portfolioValue - portfolioCost;
  const totalReturn    = calcTotalReturn(portfolioValue, portfolioCost);

  const totalAssets = totalBankAssets + portfolioValue;

  // ── Liabilities ────────────────────────────────────────────────────────────
  const liabilityRecords = await prisma.liability.findMany({ where: { isActive: true } });
  const totalLiabilities = liabilityRecords.reduce((s, l) => s + l.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  // Previous month net worth for change %
  const prevSnapshot = await prisma.netWorthSnapshot.findFirst({
    where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
    orderBy: { date: "desc" },
  });
  const netWorthChange = prevSnapshot && prevSnapshot.netWorth > 0
    ? ((netWorth - prevSnapshot.netWorth) / prevSnapshot.netWorth) * 100
    : 0;

  // ── Current-month cash flow (excluding internal transfers) ─────────────────
  const txThisMonth = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });
  const realThisMonth = txThisMonth.filter(
    (t) => !isInternalTransfer(t.category, t.description)
  );
  const income   = realThisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = realThisMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Savings rate: previous complete month (avoids partial-month distortion) ─
  const txPrevMonth = await prisma.transaction.findMany({
    where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
  });
  const realPrevMonth = txPrevMonth.filter(
    (t) => !isInternalTransfer(t.category, t.description)
  );
  const prevIncome   = realPrevMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = realPrevMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRate  = calcSavingsRate(prevIncome, prevExpenses);

  // Top expense categories this month (excluding transfers)
  const catMap: Record<string, number> = {};
  for (const tx of realThisMonth) {
    if (tx.amount < 0) {
      const cat = tx.category ?? "Sin categoría";
      catMap[cat] = (catMap[cat] ?? 0) + Math.abs(tx.amount);
    }
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, amount]) => ({
      name,
      amount,
      percentOfIncome: income > 0 ? (amount / income) * 100 : 0,
    }));

  // Top investment positions
  const topPositions = positions
    .map((p) => {
      const value = p.shares * (p.currentPrice ?? p.averageCost);
      const cost  = p.shares * p.averageCost;
      return {
        ticker: p.ticker,
        name: p.name,
        value,
        weight: portfolioValue > 0 ? (value / portfolioValue) * 100 : 0,
        returnPct: calcTotalReturn(value, cost),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Savings goals
  const goals = await prisma.savingsGoal.findMany({ where: { isCompleted: false } });
  const goalList = goals.map((g) => ({
    name: g.name,
    currentAmount: g.currentAmount,
    targetAmount: g.targetAmount,
    progress: calcGoalProgress(g.currentAmount, g.targetAmount),
    targetDate: g.targetDate ? format(g.targetDate, "dd/MM/yyyy") : undefined,
  }));

  // Budgets with current month spend
  const budgets = await prisma.budget.findMany();
  const budgetList = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.transaction.aggregate({
        where: {
          category: b.category,
          date: { gte: monthStart, lte: monthEnd },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      });
      const spentAmt = Math.abs(spent._sum.amount ?? 0);
      return {
        category: b.category,
        budget: b.amount,
        spent: spentAmt,
        percent: b.amount > 0 ? (spentAmt / b.amount) * 100 : 0,
      };
    })
  );

  // ── Full transaction history (from start of current year, excluding internal transfers) ─
  // Dynamic start date so the AI always sees the complete current year regardless of when
  // it is queried. No hard cap on count — take up to 2000 to cover a full year
  // across all accounts.
  const historyStart = startOfYear(now);
  const rawRecentTxs = await prisma.transaction.findMany({
    where: { date: { gte: historyStart } },
    orderBy: { date: "desc" },
    take: 2000,
    include: { account: { select: { name: true, bank: true } } },
  });
  const recentTransactions = rawRecentTxs
    .filter((t) => !isInternalTransfer(t.category, t.description))
    .map((t) => ({
      date: format(t.date, "dd/MM/yyyy"),
      description: t.description,
      amount: t.amount,
      category: t.category,
      subcategory: t.subcategory,
      account: t.account.name,
      bank: t.account.bank,
    }));

  return {
    date: format(now, "d 'de' MMMM yyyy", { locale: es }),
    historyStart: format(historyStart, "MMMM yyyy", { locale: es }),
    netWorth,
    netWorthChange,
    totalAssets,
    liabilities: totalLiabilities,
    liabilityBreakdown: liabilityRecords.map(l => ({ name: l.name, type: l.type, balance: l.balance })),
    accounts: accountsWithBalance.map((a) => ({
      name: a.name,
      bank: a.bank,
      balance: a.balance,
      type: a.type,
    })),
    currentMonth: format(now, "MMMM yyyy", { locale: es }),
    income,
    expenses,
    savingsRate,
    topCategories,
    portfolioValue,
    portfolioCost,
    totalReturn,
    totalReturnEur,
    topPositions,
    goals: goalList,
    budgets: budgetList,
    recentTransactions,
  };
}
