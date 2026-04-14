import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { calcSavingsRate, calcTotalReturn, isInternalTransfer } from "@/lib/utils/calculations";

export async function GET() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  // ── 1. Bank balances ────────────────────────────────────────────────────────
  // Priority: 1) manual AccountBalance snapshot, 2) last tx.balance (Disponible/Saldo),
  // 3) sum of amounts. This is identical to /api/accounts.
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  let totalBank = 0;
  for (const acc of accounts) {
    const snapshot = await prisma.accountBalance.findFirst({
      where: { accountId: acc.id },
      orderBy: { date: "desc" },
    });
    if (snapshot) { totalBank += snapshot.balance; continue; }

    const lastTxWithBalance = await prisma.transaction.findFirst({
      where: { accountId: acc.id, balance: { not: null } },
      orderBy: { date: "desc" },
    });
    if (lastTxWithBalance?.balance != null) { totalBank += lastTxWithBalance.balance; continue; }

    const txSum = await prisma.transaction.aggregate({
      where: { accountId: acc.id },
      _sum: { amount: true },
    });
    totalBank += txSum._sum.amount ?? 0;
  }

  // ── 2. Investment portfolio ─────────────────────────────────────────────────
  const positions = await prisma.investmentPosition.findMany();
  const portfolioValue = positions.reduce((s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0);
  const portfolioCost  = positions.reduce((s, p) => s + p.shares * p.averageCost, 0);

  // ── 3. Net Worth = bank cash + portfolio (no liabilities tracked yet) ───────
  const netWorth = totalBank + portfolioValue;

  // Previous net worth snapshot for % change
  const prevSnap = await prisma.netWorthSnapshot.findFirst({
    where: { date: { gte: prevStart, lte: prevEnd } },
    orderBy: { date: "desc" },
  });
  const netWorthChange = prevSnap && prevSnap.netWorth > 0
    ? ((netWorth - prevSnap.netWorth) / prevSnap.netWorth) * 100
    : 0;

  // ── 4. Current-month cash flow (EXCLUDING internal transfers) ───────────────
  // Internal transfers (e.g. "Traspaso ING → BBVA") must NOT count as income
  // or expense — they merely move money between own accounts.
  const txCurrent = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
  });
  const realCurrent = txCurrent.filter(
    (t) => !isInternalTransfer(t.category, t.description)
  );
  const income   = realCurrent.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = realCurrent.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── 5. Previous-month cash flow (for savings rate & comparison) ─────────────
  // Savings rate is always shown for the PREVIOUS COMPLETE month so that a
  // partial current month does not produce misleading ratios (e.g. −700%).
  const txPrev = await prisma.transaction.findMany({
    where: { date: { gte: prevStart, lte: prevEnd } },
  });
  const realPrev = txPrev.filter(
    (t) => !isInternalTransfer(t.category, t.description)
  );
  const prevIncome   = realPrev.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const prevExpenses = realPrev.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return NextResponse.json({
    data: {
      // Net worth
      netWorth,
      netWorthChange,
      totalAssets: netWorth,
      liabilities: 0,

      // Savings rate: previous complete month (stable, not distorted by partial months)
      savingsRate: calcSavingsRate(prevIncome, prevExpenses),
      savingsRateChange: 0,

      // Portfolio
      portfolioReturn: calcTotalReturn(portfolioValue, portfolioCost),
      portfolioReturnChange: 0,

      // Current-month expenses & income (excluding transfers)
      monthlyExpenses: expenses,
      monthlyExpensesChange:
        prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0,
      monthlyIncome: income,
      monthlySavings: income - expenses,
    },
    error: null,
  });
}
