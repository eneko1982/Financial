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

  if (accounts.length === 0) return NextResponse.json({ data: [], error: null });

  const accountIds = accounts.map(a => a.id);

  // 1. Latest manual balance snapshot per account (bulk query)
  const snapshots = await prisma.accountBalance.findMany({
    where: { accountId: { in: accountIds } },
    orderBy: { date: "desc" },
    distinct: ["accountId"],
    select: { accountId: true, balance: true },
  });
  const snapshotMap = new Map(snapshots.map(s => [s.accountId, s.balance]));

  // 2. Latest transaction with balance field, for accounts missing a snapshot
  const needsBalanceTx = accountIds.filter(id => !snapshotMap.has(id));
  const lastTxBalances = needsBalanceTx.length > 0
    ? await prisma.transaction.findMany({
        where: { accountId: { in: needsBalanceTx }, balance: { not: null } },
        orderBy: { date: "desc" },
        distinct: ["accountId"],
        select: { accountId: true, balance: true },
      })
    : [];
  const lastTxBalanceMap = new Map(lastTxBalances.map(t => [t.accountId, t.balance as number]));

  // 3. Sum of transactions for accounts with neither source
  const needsSum = needsBalanceTx.filter(id => !lastTxBalanceMap.has(id));
  const txSums = needsSum.length > 0
    ? await prisma.transaction.groupBy({
        by: ["accountId"],
        where: { accountId: { in: needsSum } },
        _sum: { amount: true },
      })
    : [];
  const txSumMap = new Map(txSums.map(s => [s.accountId, s._sum.amount ?? 0]));

  const withBalance = accounts.map(acc => ({
    ...acc,
    balance: snapshotMap.get(acc.id) ?? lastTxBalanceMap.get(acc.id) ?? txSumMap.get(acc.id) ?? 0,
  }));

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
