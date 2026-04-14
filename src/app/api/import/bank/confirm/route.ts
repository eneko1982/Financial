import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParsedTransaction } from "@/types/financial";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transactions, accountId } = body as { transactions: ParsedTransaction[]; accountId: string };

  if (!transactions?.length || !accountId) {
    return NextResponse.json({ data: null, error: "Datos requeridos" }, { status: 400 });
  }

  // Insertar una a una, ignorando duplicados por importHash único
  let count = 0;
  for (const tx of transactions) {
    try {
      await prisma.transaction.create({
        data: {
          accountId,
          date: new Date(tx.date),
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance,
          category: tx.suggestedCategory ?? "Sin categoría",
          importHash: tx.importHash,
        },
      });
      count++;
    } catch {
      // Conflicto de clave única (importHash duplicado) — se omite
    }
  }

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

  await prisma.netWorthSnapshot.create({
    data: {
      date: new Date(),
      totalAssets,
      netWorth: totalAssets,
      breakdown: JSON.stringify({ bank: totalBank, portfolio: portfolioValue }),
    },
  });

  return NextResponse.json({ data: { count }, error: null });
}
