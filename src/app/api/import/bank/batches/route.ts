import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function GET() {
  // Group transactions by (createdAt, accountId) — in PostgreSQL, all rows
  // from a single createMany share the exact same createdAt timestamp.
  const groups = await prisma.transaction.groupBy({
    by: ["createdAt", "accountId"],
    _count: { id: true },
    _min: { date: true },
    _max: { date: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (groups.length === 0) {
    return NextResponse.json({ data: [], error: null });
  }

  const accountIds = Array.from(new Set(groups.map((g) => g.accountId)));
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true, bank: true },
  });
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const batches = groups.map((g) => ({
    createdAt: g.createdAt.toISOString(),
    accountId: g.accountId,
    accountName: accountMap[g.accountId]?.name ?? "Cuenta desconocida",
    accountBank: accountMap[g.accountId]?.bank ?? "",
    count: g._count.id,
    dateFrom: g._min.date,
    dateTo: g._max.date,
  }));

  return NextResponse.json({ data: batches, error: null });
}

export async function DELETE(req: NextRequest) {
  const { createdAt, accountId } = await req.json() as { createdAt: string; accountId: string };

  if (!createdAt || !accountId) {
    return NextResponse.json({ data: null, error: "createdAt y accountId son requeridos" }, { status: 400 });
  }

  const result = await prisma.transaction.deleteMany({
    where: {
      createdAt: new Date(createdAt),
      accountId,
    },
  });

  invalidateFinancialContext();
  return NextResponse.json({ data: { count: result.count }, error: null });
}
