import { prisma } from "./prisma";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { FinancialContext } from "@/types/financial";
import { calcSavingsRate, calcTotalReturn, calcGoalProgress } from "./utils/calculations";

export async function buildFinancialContext(): Promise<FinancialContext> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  // Accounts with latest balances
  const accounts = await prisma.account.findMany({ where: { isActive: true } });

  // Get latest balance per account
  const accountsWithBalance = await Promise.all(
    accounts.map(async (acc) => {
      const lastBalance = await prisma.accountBalance.findFirst({
        where: { accountId: acc.id },
        orderBy: { date: "desc" },
      });
      // Or derive from transactions
      const txSum = await prisma.transaction.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      return {
        ...acc,
        balance: lastBalance?.balance ?? txSum._sum.amount ?? 0,
      };
    })
  );

  const totalBankAssets = accountsWithBalance.reduce((s, a) => s + a.balance, 0);

  // Investment portfolio
  const positions = await prisma.investmentPosition.findMany({
    include: { account: true },
  });

  const portfolioCost = positions.reduce((s, p) => s + p.shares * p.averageCost, 0);
  const portfolioValue = positions.reduce((s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0);
  const totalReturnEur = portfolioValue - portfolioCost;
  const totalReturn = calcTotalReturn(portfolioValue, portfolioCost);

  const totalAssets = totalBankAssets + portfolioValue;
  const netWorth = totalAssets; // no liabilities model yet

  // Previous month net worth for change %
  const prevSnapshot = await prisma.netWorthSnapshot.findFirst({
    where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
    orderBy: { date: "desc" },
  });
  const netWorthChange = prevSnapshot
    ? ((netWorth - prevSnapshot.netWorth) / prevSnapshot.netWorth) * 100
    : 0;

  // Current month cashflow
  const txThisMonth = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });
  const income = txThisMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txThisMonth.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const savingsRate = calcSavingsRate(income, expenses);

  // Top categories this month
  const catMap: Record<string, number> = {};
  for (const tx of txThisMonth) {
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
      const cost = p.shares * p.averageCost;
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

  return {
    date: format(now, "d 'de' MMMM yyyy", { locale: es }),
    netWorth,
    netWorthChange,
    totalAssets,
    liabilities: 0,
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
  };
}
