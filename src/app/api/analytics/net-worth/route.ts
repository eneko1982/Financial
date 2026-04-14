import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLastNMonths } from "@/lib/utils/dates";
import { endOfMonth } from "date-fns";

export async function GET() {
  const months = getLastNMonths(12);
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  const positions = await prisma.investmentPosition.findMany();
  const portfolioValue = positions.reduce(
    (s, p) => s + p.shares * (p.currentPrice ?? p.averageCost), 0
  );

  // For each month, sum the most recent balance of each account up to end of that month
  const result = await Promise.all(
    months.map(async ({ end, label }) => {
      const endDate = endOfMonth(end);
      let bankTotal = 0;
      for (const acc of accounts) {
        // Use the Disponible (balance field) of the last transaction up to this month
        const lastTx = await prisma.transaction.findFirst({
          where: { accountId: acc.id, date: { lte: endDate }, balance: { not: null } },
          orderBy: { date: "desc" },
        });
        if (lastTx?.balance != null) {
          bankTotal += lastTx.balance;
          continue;
        }
        // Fallback: sum all transactions up to this month
        const agg = await prisma.transaction.aggregate({
          where: { accountId: acc.id, date: { lte: endDate } },
          _sum: { amount: true },
        });
        bankTotal += agg._sum.amount ?? 0;
      }
      const netWorth = bankTotal + portfolioValue;
      return { date: label, netWorth, assets: netWorth };
    })
  );

  // Only return months that have data (netWorth > 0) or are after first transaction
  const firstNonZero = result.findIndex((r) => r.netWorth !== 0);
  const trimmed = firstNonZero >= 0 ? result.slice(firstNonZero) : result;

  return NextResponse.json({ data: trimmed, error: null });
}
