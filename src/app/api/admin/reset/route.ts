import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST() {
  const [tx, ab, nw] = await Promise.all([
    prisma.transaction.deleteMany({}),
    prisma.accountBalance.deleteMany({}),
    prisma.netWorthSnapshot.deleteMany({}),
  ]);
  invalidateFinancialContext();
  return NextResponse.json({
    data: { transactions: tx.count, accountBalances: ab.count, snapshots: nw.count },
    error: null,
  });
}
