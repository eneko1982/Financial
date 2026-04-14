import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface BulkPosition {
  ticker: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number | null;
  assetClass: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { positions, accountId } = body as { positions: BulkPosition[]; accountId: string };

  if (!positions?.length || !accountId) {
    return NextResponse.json({ data: null, error: "Datos requeridos" }, { status: 400 });
  }

  // Upsert each position (update if ticker exists in this account, create otherwise)
  let created = 0;
  let updated = 0;
  for (const pos of positions) {
    const existing = await prisma.investmentPosition.findFirst({
      where: { accountId, ticker: pos.ticker },
    });
    if (existing) {
      await prisma.investmentPosition.update({
        where: { id: existing.id },
        data: { shares: pos.shares, averageCost: pos.averageCost, currentPrice: pos.currentPrice, lastUpdated: new Date() },
      });
      updated++;
    } else {
      await prisma.investmentPosition.create({
        data: { ...pos, accountId, lastUpdated: new Date() },
      });
      created++;
    }
  }

  return NextResponse.json({ data: { created, updated }, error: null });
}
