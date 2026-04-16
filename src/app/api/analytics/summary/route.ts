import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { calcSavingsRate, calcTotalReturn, isInternalTransfer } from "@/lib/utils/calculations";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const monthParam = searchParams.get("month"); // "YYYY-MM" or null

  // If a specific month is requested, build a date within that month;
  // otherwise use the current date (always-current behaviour for KPI widgets).
  const referenceDate = monthParam
    ? parseISO(`${monthParam}-15`)
    : new Date();

  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const prevStart = startOfMonth(subMonths(referenceDate, 1));
  const prevEnd = endOfMonth(subMonths(referenceDate, 1));

  // ── 1. Bank balances (date-aware: use whichever source is more recent) ────────
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  const accountIds = accounts.map(a => a.id);

  const [snapshots, lastTxBals, positions, liabilityRecords] = await Promise.all([
    accountIds.length > 0 ? prisma.accountBalance.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }) : Promise.resolve([]),
    accountIds.length > 0 ? prisma.transaction.findMany({
      where: { accountId: { in: accountIds }, balance: { not: null } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }) : Promise.resolve([]),
    prisma.investmentPosition.findMany(),
    prisma.liability.findMany({ where: { isActive: true } }),
  ]);

  const snapshotMap = new Map(snapshots.map(s => [s.accountId, s]));
  const txBalMap    = new Map(lastTxBals.map(t => [t.accountId, t]));

  const needsSum = accountIds.filter(id => !snapshotMap.has(id) && !txBalMap.has(id));
  const txSums = needsSum.length > 0
    ? await prisma.transaction.groupBy({ by: ["accountId"], where: { accountId: { in: needsSum } }, _sum: { amount: true } })
    : [];
  const txSumMap = new Map(txSums.map(s => [s.accountId, s._sum.amount ?? 0]));

  let totalBank = 0;
  for (const acc of accounts) {
    const snap = snapshotMap.get(acc.id);
    const tx   = txBalMap.get(acc.id);
    if (snap && tx) {
      totalBank += tx.date >= snap.date ? (tx.balance as number) : snap.balance;
    } else if (tx) {
      totalBank += tx.balance as number;
    } else if (snap) {
      totalBank += snap.balance;
    } else {
      totalBank += txSumMap.get(acc.id) ?? 0;
    }
  }

  // ── 2. Investment portfolio ─────────────────────────────────────────────────
  const portfolioValue = positions.reduce((s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0);
  const portfolioCost  = positions.reduce((s, p) => s + p.shares * p.averageCost, 0);

  // ── 3. Net Worth = bank + portfolio − liabilities ──────────────────────────
  const totalLiabilities = liabilityRecords.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalBank + portfolioValue - totalLiabilities;

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
      totalAssets: totalBank + portfolioValue,
      liabilities: totalLiabilities,

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
