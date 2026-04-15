import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST() {
  // Delete in FK-safe order using raw SQL to avoid any Prisma type issues
  await prisma.$executeRawUnsafe(`DELETE FROM "AIMessage"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "AIConversation"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "AIReport"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "NetWorthSnapshot"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "AccountBalance"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Transaction"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "InvestmentTransaction"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "InvestmentPosition"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "InvestmentAccount"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Liability"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "SavingsGoal"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "Budget"`);
  await prisma.$executeRawUnsafe(`DELETE FROM "TransactionRule"`);

  invalidateFinancialContext();

  return NextResponse.json({ data: { ok: true }, error: null });
}
