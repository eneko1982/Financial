import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateRulesCache } from "@/lib/transaction-rules";

export async function GET() {
  const rules = await prisma.transactionRule.findMany({
    orderBy: { priority: "asc" },
  });
  return NextResponse.json({ data: rules, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string;
    pattern: string;
    matchType?: string;
    category: string;
    subcategory?: string | null;
    priority?: number;
  };

  if (!body.name || !body.pattern || !body.category) {
    return NextResponse.json({ data: null, error: "name, pattern y category son requeridos" }, { status: 400 });
  }

  const rule = await prisma.transactionRule.create({
    data: {
      name: body.name,
      pattern: body.pattern,
      matchType: body.matchType ?? "contains",
      category: body.category,
      subcategory: body.subcategory ?? null,
      priority: body.priority ?? 0,
    },
  });

  invalidateRulesCache();
  return NextResponse.json({ data: rule, error: null });
}
