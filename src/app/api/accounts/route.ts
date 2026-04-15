import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["checking", "savings", "investment", "credit", "epsv"]),
  includeInNetWorth: z.boolean().default(true),
  bank: z.string().min(1),
  currency: z.string().default("EUR"),
  color: z.string().optional(),
  initialBalance: z.number().optional(),
});

export async function GET() {
  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (accounts.length === 0) return NextResponse.json({ data: [], error: null });

  const accountIds = accounts.map(a => a.id);

  // Balance resolution (date-aware, 3 sources):
  // 1. AccountBalance snapshot  vs  latest tx.balance — use whichever has the MORE RECENT date.
  //    This fixes the bug where an old initial-balance snapshot would override imported transactions.
  // 2. If only one source exists, use it.
  // 3. If neither has a balance figure, fall back to summing transaction amounts.

  const [snapshots, lastTxBalances] = await Promise.all([
    prisma.accountBalance.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { accountId: { in: accountIds }, balance: { not: null } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }),
  ]);

  const snapshotMap  = new Map(snapshots.map(s => [s.accountId, s]));
  const lastTxBalMap = new Map(lastTxBalances.map(t => [t.accountId, t]));

  // Sum of amounts only for accounts with no balance data from either source
  const needsSum = accountIds.filter(id => !snapshotMap.has(id) && !lastTxBalMap.has(id));
  const txSums = needsSum.length > 0
    ? await prisma.transaction.groupBy({
        by: ["accountId"],
        where: { accountId: { in: needsSum } },
        _sum: { amount: true },
      })
    : [];
  const txSumMap = new Map(txSums.map(s => [s.accountId, s._sum.amount ?? 0]));

  const withBalance = accounts.map(acc => {
    const snap = snapshotMap.get(acc.id);
    const tx   = lastTxBalMap.get(acc.id);
    let balance: number;
    if (snap && tx) {
      // Both exist — prefer the one with the more recent date.
      // On a tie, transaction balance wins (bank data is authoritative).
      balance = tx.date >= snap.date ? (tx.balance as number) : snap.balance;
    } else if (tx) {
      balance = tx.balance as number;
    } else if (snap) {
      balance = snap.balance;
    } else {
      balance = txSumMap.get(acc.id) ?? 0;
    }
    return { ...acc, balance };
  });

  return NextResponse.json({ data: withBalance, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ data: null, error: parsed.error.message }, { status: 400 });

  const { initialBalance, ...data } = parsed.data;
  // Assign sortOrder = max existing + 1 so new accounts go to the bottom
  const maxOrder = await prisma.account.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const account = await prisma.account.create({ data: { ...data, sortOrder } });

  if (initialBalance !== undefined) {
    await prisma.accountBalance.create({ data: { accountId: account.id, balance: initialBalance, date: new Date() } });
  }

  return NextResponse.json({ data: account, error: null }, { status: 201 });
}
