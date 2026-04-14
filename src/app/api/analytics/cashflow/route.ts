import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLastNMonths } from "@/lib/utils/dates";
import { isInternalTransfer } from "@/lib/utils/calculations";

export async function GET() {
  const months = getLastNMonths(6);

  const result = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const txs = await prisma.transaction.findMany({
        where: { date: { gte: start, lte: end } },
      });
      // Exclude internal transfers — they are not real income or real expenses
      const real = txs.filter((t) => !isInternalTransfer(t.category, t.description));
      const income   = real.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = real.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month: label, income, expenses, savings: income - expenses };
    })
  );

  return NextResponse.json({ data: result, error: null });
}
