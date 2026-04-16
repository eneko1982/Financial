import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcTotalReturn } from "@/lib/utils/calculations";
import { getUsdEurRate } from "@/lib/exchange-rate";

export async function GET() {
  const [positions, usdEurRate] = await Promise.all([
    prisma.investmentPosition.findMany({
      include: { account: { select: { name: true, broker: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getUsdEurRate(),
  ]);

  const enriched = positions.map((p) => {
    const isUsd = p.currency === "USD";
    const fxRate = isUsd ? usdEurRate : 1;

    const currentPriceEur = (p.currentPrice ?? p.averageCost) * fxRate;
    const avgCostEur = p.averageCost * fxRate;

    const currentValue = p.shares * currentPriceEur;
    const costBasis = p.shares * avgCostEur;
    const pnlEur = currentValue - costBasis;
    const pnlPct = calcTotalReturn(currentValue, costBasis);

    return {
      ...p,
      // EUR-converted values for display
      currentValue,
      costBasis,
      pnlEur,
      pnlPct,
      // Original prices in native currency (for editing)
      currentPriceNative: p.currentPrice,
      averageCostNative: p.averageCost,
      // Convenience
      usdEurRate: isUsd ? usdEurRate : null,
    };
  });

  const totalValue = enriched.reduce((s, p) => s + p.currentValue, 0);
  const result = enriched.map((p) => ({
    ...p,
    weight: totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0,
  }));

  return NextResponse.json({
    data: result,
    error: null,
    meta: { totalValue, usdEurRate },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const position = await prisma.investmentPosition.create({ data: body });
  return NextResponse.json({ data: position, error: null }, { status: 201 });
}
