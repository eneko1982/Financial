import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryColor } from "@/lib/category-classifier";
import { startOfMonth, endOfMonth } from "date-fns";
import { isInternalTransfer } from "@/lib/utils/calculations";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month");
  const now = month ? new Date(`${month}-01`) : new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const type = searchParams.get("type") ?? "expense"; // "expense" | "income"
  const accountId = searchParams.get("accountId");

  const txs = await prisma.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
      amount: type === "income" ? { gt: 0 } : { lt: 0 },
      ...(accountId ? { accountId } : {}),
    },
  });

  const catMap: Record<string, number> = {};
  // Exclude internal transfers — they are not real income or expenses
  for (const tx of txs.filter((t) => !isInternalTransfer(t.category, t.description))) {
    const cat = tx.category ?? (type === "income" ? "Sin categoría" : "Sin categoría");
    catMap[cat] = (catMap[cat] ?? 0) + Math.abs(tx.amount);
  }

  const total = Object.values(catMap).reduce((s, v) => s + v, 0);
  const budgets = await prisma.budget.findMany();
  const budgetMap: Record<string, number> = {};
  for (const b of budgets) budgetMap[b.category] = b.amount;

  // Prefer user-defined category colors over auto-generated ones
  const userCats = await prisma.userCategory.findMany({ where: { parentId: null }, select: { name: true, color: true } });
  const userColorMap: Record<string, string> = {};
  for (const uc of userCats) {
    if (uc.color) userColorMap[uc.name] = uc.color;
  }

  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      budget: budgetMap[category] ?? null,
      color: userColorMap[category] ?? getCategoryColor(category),
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));

  return NextResponse.json({ data: categories, error: null, meta: { total } });
}
