import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  // Fetch old transaction to compute balance delta
  const old = await prisma.transaction.findUnique({
    where: { id: params.id },
    select: { amount: true, accountId: true },
  });

  const updateData: Record<string, unknown> = { editedByUser: true };
  if (body.category   !== undefined) updateData.category   = body.category;
  if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
  if (body.notes      !== undefined) updateData.notes      = body.notes;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.amount     !== undefined) updateData.amount     = body.amount;
  if (body.date       !== undefined) updateData.date       = new Date(body.date);
  if (body.accountId  !== undefined) updateData.accountId  = body.accountId;

  const tx = await prisma.transaction.update({
    where: { id: params.id },
    data: updateData,
  });

  // If amount changed, adjust the AccountBalance snapshot so displayed balances stay correct
  if (old && body.amount !== undefined && body.amount !== old.amount) {
    const delta = (body.amount as number) - old.amount;
    const snap = await prisma.accountBalance.findFirst({
      where: { accountId: old.accountId },
      orderBy: { date: "desc" },
    });
    if (snap) {
      await prisma.accountBalance.update({
        where: { id: snap.id },
        data: { balance: snap.balance + delta },
      });
    }
  }

  invalidateFinancialContext();
  return NextResponse.json({ data: tx, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  // Fetch before deleting so we can adjust the balance snapshot
  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    select: { amount: true, accountId: true },
  });

  await prisma.transaction.delete({ where: { id: params.id } });

  // Restore the account balance by reversing this transaction's contribution.
  if (tx) {
    const [snap, lastTxBal] = await Promise.all([
      prisma.accountBalance.findFirst({
        where: { accountId: tx.accountId },
        orderBy: { date: "desc" },
      }),
      prisma.transaction.findFirst({
        where: { accountId: tx.accountId, balance: { not: null } },
        orderBy: { date: "desc" },
        select: { balance: true, date: true, id: true },
      }),
    ]);

    if (snap) {
      // AccountBalance snapshot exists — just subtract the deleted amount
      await prisma.accountBalance.update({
        where: { id: snap.id },
        data: { balance: snap.balance - tx.amount },
      });
    } else if (lastTxBal) {
      // No AccountBalance but there is a tx.balance field — create a snapshot
      // representing the balance AFTER this deletion (tx.balance minus this tx's amount,
      // because the tx.balance already "includes" this transaction's effect).
      await prisma.accountBalance.create({
        data: {
          accountId: tx.accountId,
          balance: (lastTxBal.balance as number) - tx.amount,
          date: new Date(),
        },
      });
    }
    // If neither source exists the balance is computed dynamically as sum of amounts,
    // so deleting the transaction automatically corrects it — no action needed.
  }

  invalidateFinancialContext();
  return NextResponse.json({ data: null, error: null });
}
