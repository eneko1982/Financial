import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { calcSavingsRate, calcTotalReturn } from "@/lib/utils/calculations";

export async function GET() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  // Bank balances — same priority as accounts page:
  // 1) manual AccountBalance snapshot, 2) last tx balance field (Disponible), 3) sum of amounts
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  let totalBank = 0;
  for (const acc of accounts) {
    const snapshot = await prisma.accountBalance.findFirst({ where: { accountId: acc.id }, orderBy: { date: "desc" } });
    if (snapshot) { totalBank += snapshot.balance; continue; }
    const lastTxWithBalance = await prisma.transaction.findFirst({
      where: { accountId: acc.id, balance: { not: null } },
      orderBy: { date: "desc" },
    });
    if (lastTxWithBalance?.balance != null) { totalBank += lastTxWithBalance.balance; continue; }
    const txSum = await prisma.transaction.aggregate({ where: { accountId: acc.id }, _sum: { amount: true } });
    totalBank += txSum._sum.amount ?? 0;
  }

  // Portfolio
  const positions = await prisma.investmentPosition.findMany();
  const portfolioValue = positions.reduce((s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0);
  const portfolioCost = positions.reduce((s, p) => s + p.shares * p.averageCost, 0);

  const totalAssets = totalBank + portfolioValue;
  const netWorth = totalAssets;

  // Previous snapshot
  const prevSnap = await prisma.netWorthSnapshot.findFirst({ where: { date: { gte: prevStart, lte: prevEnd } }, orderBy: { date: "desc" } });
  const netWorthChange = prevSnap ? ((netWorth - prevSnap.netWorth) / prevSnap.netWorth) * 100 : 0;

  // Current month cashflow
  const txCurrent = await prisma.transaction.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } });
  const income = txCurrent.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txCurrent.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // Previous month cashflow
  const txPrev = await prisma.transaction.findMany({ where: { date: { gte: prevStart, lte: prevEnd } } });
  const prevExpenses = txPrev.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return NextResponse.json({
    data: {
      netWorth,
      netWorthChange,
      totalAssets,
      liabilities: 0,
      savingsRate: calcSavingsRate(income, expenses),
      savingsRateChange: 0,
      portfolioReturn: calcTotalReturn(portfolioValue, portfolioCost),
      portfolioReturnChange: 0,
      monthlyExpenses: expenses,
      monthlyExpensesChange: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
      monthlyIncome: income,
      monthlySavings: income - expenses,
    },
    error: null,
  });
}
