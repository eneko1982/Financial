import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParsedTransaction } from "@/types/financial";
import { invalidateFinancialContext } from "@/lib/financial-context";
import { getActiveRules, applyRules } from "@/lib/transaction-rules";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { transactions, accountId } = body as { transactions: ParsedTransaction[]; accountId: string };

  if (!transactions?.length || !accountId) {
    return NextResponse.json({ data: null, error: "Datos requeridos" }, { status: 400 });
  }

  // Apply user-defined categorization rules (override AI-suggested categories)
  const rules = await getActiveRules();
  const enriched = transactions.map((tx) => {
    const ruleMatch = rules.length > 0 ? applyRules(tx.description, rules) : null;
    return {
      accountId,
      date: new Date(tx.date),
      description: tx.description,
      amount: tx.amount,
      balance: tx.balance ?? null,
      category: ruleMatch?.category ?? tx.suggestedCategory ?? "Sin categoría",
      subcategory: ruleMatch?.subcategory ?? null,
      importHash: tx.importHash,
    };
  });

  // Bulk insert con skipDuplicates — mucho más rápido que insertar una a una
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (prisma.transaction.createMany as any)({
    data: enriched,
    skipDuplicates: true,
  }) as { count: number };
  const count = result.count;

  // Update AccountBalance snapshot for the imported account so balance is immediately correct
  const latestTxWithBalance = await prisma.transaction.findFirst({
    where: { accountId, balance: { not: null } },
    orderBy: [{ date: "desc" }],
    select: { balance: true, date: true },
  });
  if (latestTxWithBalance) {
    // Replace any old snapshot with the bank's latest confirmed balance.
    // Use sentinel date (2099) so this snapshot always wins any future comparison.
    await prisma.accountBalance.deleteMany({ where: { accountId } });
    await prisma.accountBalance.create({
      data: {
        accountId,
        balance: latestTxWithBalance.balance!,
        date: new Date("2099-12-31T23:59:59.999Z"),
      },
    });
  }

  // Guardar snapshot de patrimonio neto — compute totalBank using date-aware balance logic
  const allAccounts = await prisma.account.findMany({ where: { isActive: true } });
  const allAccountIds = allAccounts.map(a => a.id);

  const [balanceSnapshots, lastTxBals] = await Promise.all([
    prisma.accountBalance.findMany({
      where: { accountId: { in: allAccountIds } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { accountId: { in: allAccountIds }, balance: { not: null } },
      orderBy: { date: "desc" },
      distinct: ["accountId"],
      select: { accountId: true, balance: true, date: true },
    }),
  ]);
  const bsMap  = new Map(balanceSnapshots.map(s => [s.accountId, s]));
  const txbMap = new Map(lastTxBals.map(t => [t.accountId, t]));

  const needsSumIds = allAccountIds.filter(id => !bsMap.has(id) && !txbMap.has(id));
  const txSumsSnap = needsSumIds.length > 0
    ? await prisma.transaction.groupBy({
        by: ["accountId"],
        where: { accountId: { in: needsSumIds } },
        _sum: { amount: true },
      })
    : [];
  const txSumMapSnap = new Map(txSumsSnap.map(s => [s.accountId, s._sum.amount ?? 0]));

  let totalBank = 0;
  for (const acc of allAccounts) {
    const snap = bsMap.get(acc.id);
    const tx   = txbMap.get(acc.id);
    if (snap && tx) {
      totalBank += tx.date >= snap.date ? (tx.balance as number) : snap.balance;
    } else if (tx) {
      totalBank += tx.balance as number;
    } else if (snap) {
      totalBank += snap.balance;
    } else {
      totalBank += txSumMapSnap.get(acc.id) ?? 0;
    }
  }
  const positions = await prisma.investmentPosition.findMany();
  const portfolioValue = positions.reduce(
    (s, p) => s + p.shares * (p.currentPrice ?? p.averageCost),
    0
  );
  const totalAssets = totalBank + portfolioValue;
  const liabilityRecords = await prisma.liability.findMany({ where: { isActive: true } });
  const totalLiabilities = liabilityRecords.reduce((s, l) => s + l.balance, 0);
  const netWorthReal = totalAssets - totalLiabilities;

  await prisma.netWorthSnapshot.create({
    data: {
      date: new Date(),
      totalAssets,
      liabilities: totalLiabilities,
      netWorth: netWorthReal,
      breakdown: JSON.stringify({ bank: totalBank, portfolio: portfolioValue, liabilities: totalLiabilities }),
    },
  });

  // Invalidate AI context cache so next chat uses fresh data
  invalidateFinancialContext();

  return NextResponse.json({ data: { count }, error: null });
}
