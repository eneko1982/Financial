import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // "YYYY-MM"
  const now = month ? new Date(`${month}-01`) : new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const budgets = await prisma.budget.findMany({ orderBy: { category: "asc" } });

  const withSpend = await Promise.all(
    budgets.map(async (b) => {
      const agg = await prisma.transaction.aggregate({
        where: { category: b.category, date: { gte: start, lte: end }, amount: { lt: 0 } },
        _sum: { amount: true },
      });
      const spent = Math.abs(agg._sum.amount ?? 0);
      return { ...b, spent, percent: b.amount > 0 ? (spent / b.amount) * 100 : 0 };
    })
  );

  return NextResponse.json({ data: withSpend, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const budget = await prisma.budget.upsert({
    where: { category_period: { category: body.category, period: body.period ?? "monthly" } },
    update: { amount: body.amount, color: body.color, icon: body.icon },
    create: body,
  });
  return NextResponse.json({ data: budget, error: null }, { status: 201 });
}
