import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLastNMonths } from "@/lib/utils/dates";

export async function GET() {
  const months = getLastNMonths(12);

  const snapshots = await prisma.netWorthSnapshot.findMany({
    orderBy: { date: "asc" },
  });

  // Map snapshots to months, fill gaps
  const result = months.map(({ start, end, label }) => {
    const snap = snapshots.find((s) => s.date >= start && s.date <= end);
    return {
      date: label,
      netWorth: snap?.netWorth ?? 0,
      assets: snap?.totalAssets ?? 0,
    };
  });

  return NextResponse.json({ data: result, error: null });
}
