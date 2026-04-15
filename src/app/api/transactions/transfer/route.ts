import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST(req: NextRequest) {
  const { fromAccountId, toAccountId, amount, date, description, notes } = await req.json() as {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description?: string;
    notes?: string;
  };

  if (!fromAccountId || !toAccountId || !amount) {
    return NextResponse.json({ data: null, error: "fromAccountId, toAccountId y amount son requeridos" }, { status: 400 });
  }
  if (fromAccountId === toAccountId) {
    return NextResponse.json({ data: null, error: "Las cuentas deben ser distintas" }, { status: 400 });
  }

  const txDate = new Date(date + "T12:00:00");
  const desc = description || "Transferencia entre cuentas";

  // Create both sides of the transfer
  const [debit, credit] = await Promise.all([
    prisma.transaction.create({
      data: {
        accountId: fromAccountId,
        amount: -Math.abs(amount),
        date: txDate,
        description: desc,
        notes: notes ?? null,
        category: "Transferencia",
        isTransfer: true,
        editedByUser: true,
      },
    }),
    prisma.transaction.create({
      data: {
        accountId: toAccountId,
        amount: Math.abs(amount),
        date: txDate,
        description: desc,
        notes: notes ?? null,
        category: "Transferencia",
        isTransfer: true,
        editedByUser: true,
      },
    }),
  ]);

  // Update AccountBalance for both accounts
  await Promise.all([
    refreshBalance(fromAccountId, -Math.abs(amount)),
    refreshBalance(toAccountId, Math.abs(amount)),
  ]);

  invalidateFinancialContext();
  return NextResponse.json({ data: { debit, credit }, error: null }, { status: 201 });
}

async function refreshBalance(accountId: string, delta: number) {
  const [snap, lastTx] = await Promise.all([
    prisma.accountBalance.findFirst({ where: { accountId }, orderBy: { date: "desc" }, select: { balance: true, date: true } }),
    prisma.transaction.findFirst({ where: { accountId, balance: { not: null } }, orderBy: { date: "desc" }, select: { balance: true, date: true } }),
  ]);

  let current = 0;
  if (snap && lastTx) {
    current = lastTx.date >= snap.date ? (lastTx.balance as number) : snap.balance;
  } else if (lastTx) {
    current = lastTx.balance as number;
  } else if (snap) {
    current = snap.balance;
  } else {
    const agg = await prisma.transaction.aggregate({ where: { accountId }, _sum: { amount: true } });
    // delta is already included in the new transaction so subtract it back to get pre-tx sum
    current = (agg._sum.amount ?? 0) - delta;
  }

  await prisma.accountBalance.deleteMany({ where: { accountId } });
  await prisma.accountBalance.create({ data: { accountId, balance: current + delta, date: new Date() } });
}
