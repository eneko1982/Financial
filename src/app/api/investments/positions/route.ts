import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcTotalReturn } from "@/lib/utils/calculations";

export async function GET() {
  const positions = await prisma.investmentPosition.findMany({
    include: { account: { select: { name: true, broker: true } } },
    orderBy: { createdAt: "asc" },
  });

  const enriched = positions.map((p) => {
    const currentPrice = p.currentPrice ?? p.averageCost;
    const currentValue = p.shares * currentPrice;
    const costBasis = p.shares * p.averageCost;
    const pnlEur = currentValue - costBasis;
    const pnlPct = calcTotalReturn(currentValue, costBasis);
    return { ...p, currentValue, costBasis, pnlEur, pnlPct };
  });

  const totalValue = enriched.reduce((s, p) => s + p.currentValue, 0);
  const result = enriched.map((p) => ({
    ...p,
    weight: totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0,
  }));

  return NextResponse.json({ data: result, error: null, meta: { totalValue } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const position = await prisma.investmentPosition.create({ data: body });
  return NextResponse.json({ data: position, error: null }, { status: 201 });
}
