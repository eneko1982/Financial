import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const [total, transactions] = await Promise.all([
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
  ]);

  return NextResponse.json({ data: transactions, error: null, meta: { total, page, limit } });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tx = await prisma.transaction.create({ data: body });
  return NextResponse.json({ data: tx, error: null }, { status: 201 });
}
