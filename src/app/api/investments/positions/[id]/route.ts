import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { shares, averageCost, currentPrice, name, assetClass, currency } = body;

  const position = await prisma.investmentPosition.update({
    where: { id: params.id },
    data: {
      ...(shares != null && { shares: parseFloat(shares) }),
      ...(averageCost != null && { averageCost: parseFloat(averageCost) }),
      ...(currentPrice !== undefined && { currentPrice: currentPrice ? parseFloat(currentPrice) : null }),
      ...(name != null && { name }),
      ...(assetClass != null && { assetClass }),
      ...(currency != null && { currency }),
      lastUpdated: new Date(),
    },
  });

  return NextResponse.json({ data: position, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.investmentPosition.delete({ where: { id: params.id } });
  return NextResponse.json({ data: null, error: null });
}
