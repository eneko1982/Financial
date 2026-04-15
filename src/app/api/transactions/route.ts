import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const editedByUser = searchParams.get("editedByUser");

  const where: Record<string, unknown> = {};
  if (accountId) where.accountId = accountId;
  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (search) {
    where.description = { contains: search };
  }
  if (editedByUser === "false") where.editedByUser = false;
  if (editedByUser === "true") where.editedByUser = true;

  const [total, transactions, aggregate] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        balance: true,
        category: true,
        subcategory: true,
        notes: true,
        isTransfer: true,
        editedByUser: true,
        importHash: true,
        createdAt: true,
        accountId: true,
        account: { select: { name: true, bank: true, color: true } },
      },
    }),
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
  ]);

  const sum = aggregate._sum.amount ?? 0;
  return NextResponse.json({ data: transactions, error: null, meta: { total, page, limit, sum } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tx = await prisma.transaction.create({ data: body });
  await refreshBalance(tx.accountId, tx.amount);
  invalidateFinancialContext();
  return NextResponse.json({ data: tx, error: null }, { status: 201 });
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
    current = (agg._sum.amount ?? 0) - delta;
  }

  await prisma.accountBalance.deleteMany({ where: { accountId } });
  await prisma.accountBalance.create({ data: { accountId, balance: current + delta, date: new Date() } });
}
