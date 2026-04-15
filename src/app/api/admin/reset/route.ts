import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST() {
  // Delete in order to respect foreign key constraints
  await prisma.aIMessage.deleteMany({});
  await prisma.aIConversation.deleteMany({});
  await prisma.aIReport.deleteMany({});
  await prisma.netWorthSnapshot.deleteMany({});
  await prisma.accountBalance.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.investmentTransaction.deleteMany({});
  await prisma.investmentPosition.deleteMany({});
  await prisma.investmentAccount.deleteMany({});
  await prisma.liability.deleteMany({});
  await prisma.savingsGoal.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transactionRule.deleteMany({});

  invalidateFinancialContext();

  return NextResponse.json({ data: { ok: true, message: "Todo borrado" }, error: null });
}
