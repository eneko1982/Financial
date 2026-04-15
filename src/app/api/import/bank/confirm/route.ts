import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParsedTransaction } from "@/types/financial";
import { invalidateFinancialContext } from "@/lib/financial-context";
import { getActiveRules, applyRules } from "@/lib/transaction-rules";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transactions, accountId } = body as { transactions: ParsedTransaction[]; accountId: string };

  if (!transactions?.length || !accountId) {
    return NextResponse.json({ data: null, error: "Datos requeridos" }, { status: 400 });
  }

  // Apply user-defined categorization rules (override AI-suggested categories)
  const rules = await getActiveRules();
  const enriched = transactions.map((tx) => {
    const ruleMatch = rules.length > 0 ? applyRules(tx.description, rules) : null;
    return {
      accountId,
      date: new Date(tx.date),
      description: tx.description,
      amount: tx.amount,
      balance: tx.balance ?? null,
      category: ruleMatch?.category ?? tx.suggestedCategory ?? "Sin categoría",
      subcategory: ruleMatch?.subcategory ?? null,
      importHash: tx.importHash,
    };
  });

  // Bulk insert con skipDuplicates — mucho más rápido que insertar una a una
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma.transaction.createMany as any)({
    data: enriched,
    skipDuplicates: true,
  }) as { count: number };
  const count = result.count;

  // Guardar snapshot de patrimonio neto
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  let totalBank = 0;
  for (const acc of accounts) {
    const txSum = await prisma.transaction.aggregate({
      where: { accountId: acc.id },
      _sum: { amount: true },
    });
    totalBank += txSum._sum.amount ?? 0;
  }
  const positions = await prisma.investmentPosition.findMany();
  const portfolioValue = positions.reduce(
    (s, p) => s + p.shares * (p.currentPrice ?? p.averageCost),
    0
  );
  const totalAssets = totalBank + portfolioValue;
  const liabilityRecords = await prisma.liability.findMany({ where: { isActive: true } });
  const totalLiabilities = liabilityRecords.reduce((s, l) => s + l.balance, 0);
  const netWorthReal = totalAssets - totalLiabilities;

  await prisma.netWorthSnapshot.create({
    data: {
      date: new Date(),
      totalAssets,
      liabilities: totalLiabilities,
      netWorth: netWorthReal,
      breakdown: JSON.stringify({ bank: totalBank, portfolio: portfolioValue, liabilities: totalLiabilities }),
    },
  });

  // Invalidate AI context cache so next chat uses fresh data
  invalidateFinancialContext();

  return NextResponse.json({ data: { count }, error: null });
}
