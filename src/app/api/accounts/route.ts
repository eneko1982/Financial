import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["checking", "savings", "investment", "credit"]),
  bank: z.string().min(1),
  currency: z.string().default("EUR"),
  color: z.string().optional(),
  initialBalance: z.number().optional(),
});

export async function GET() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Attach current balance to each account.
  // Priority: 1) manual AccountBalance snapshot, 2) last transaction's "Disponible" running balance, 3) sum of amounts
  const withBalance = await Promise.all(
    accounts.map(async (acc) => {
      const snapshot = await prisma.accountBalance.findFirst({
        where: { accountId: acc.id },
        orderBy: { date: "desc" },
      });
      if (snapshot) return { ...acc, balance: snapshot.balance };

      const lastTxWithBalance = await prisma.transaction.findFirst({
        where: { accountId: acc.id, balance: { not: null } },
        orderBy: { date: "desc" },
      });
      if (lastTxWithBalance?.balance != null) return { ...acc, balance: lastTxWithBalance.balance };

      const txSum = await prisma.transaction.aggregate({
        where: { accountId: acc.id },
        _sum: { amount: true },
      });
      return { ...acc, balance: txSum._sum.amount ?? 0 };
    })
  );

  return NextResponse.json({ data: withBalance, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.message }, { status: 400 });

  const { initialBalance, ...data } = parsed.data;
  const account = await prisma.account.create({ data });

  if (initialBalance !== undefined) {
    await prisma.accountBalance.create({ data: { accountId: account.id, balance: initialBalance, date: new Date() } });
  }

  return NextResponse.json({ data: account, error: null }, { status: 201 });
}
