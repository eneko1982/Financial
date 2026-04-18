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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const asOf = searchParams.get("asOf"); // "YYYY-MM-DD" for historical balance, null for current

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
    if (snap) {
      // AccountBalance always wins — it's either set by the import confirm route
      // (explicit bank balance) or by refreshBalance after a manual transaction.
      // In both cases it's more authoritative than an individual tx.balance field.
      balance = snap.balance;
    } else if (tx) {
      balance = tx.balance as number;
    } else {
      balance = txSumMap.get(acc.id) ?? 0;
    }
    return { ...acc, balance };
  });

  // ── Historical mode: adjust balances point-in-time ──────────────────────
  if (asOf) {
    const asOfDate = new Date(asOf + "T23:59:59.999Z");

    // Accounts with a balance source: historicalBalance = currentBalance - sum(future txs)
    const hasBalanceSourceIds = accountIds.filter(id => snapshotMap.has(id) || lastTxBalMap.has(id));
    // Accounts without a balance source: historicalBalance = sum(txs up to asOf)
    const noBalanceSourceIds = needsSum; // same set used for txSumMap above

    const [futureTxSums, historicalTxSums] = await Promise.all([
      hasBalanceSourceIds.length > 0
        ? prisma.transaction.groupBy({
            by: ["accountId"],
            where: { accountId: { in: hasBalanceSourceIds }, date: { gt: asOfDate } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      noBalanceSourceIds.length > 0
        ? prisma.transaction.groupBy({
            by: ["accountId"],
            where: { accountId: { in: noBalanceSourceIds }, date: { lte: asOfDate } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ]);

    const futureSumMap     = new Map(futureTxSums.map(s => [s.accountId, s._sum.amount ?? 0]));
    const historicalSumMap = new Map(historicalTxSums.map(s => [s.accountId, s._sum.amount ?? 0]));

    return NextResponse.json({
      data: withBalance.map(a => {
        const usedBalanceSource = snapshotMap.has(a.id) || lastTxBalMap.has(a.id);
        const balance = usedBalanceSource
          ? a.balance - (futureSumMap.get(a.id) ?? 0)
          : historicalSumMap.get(a.id) ?? 0;
        return { ...a, balance };
      }),
      error: null,
    });
  }

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
