import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateRulesCache } from "@/lib/transaction-rules";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as {
    name?: string;
    pattern?: string;
    matchType?: string;
    category?: string;
    subcategory?: string | null;
    priority?: number;
    isActive?: boolean;
  };

  const rule = await prisma.transactionRule.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.pattern !== undefined && { pattern: body.pattern }),
      ...(body.matchType !== undefined && { matchType: body.matchType }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.subcategory !== undefined && { subcategory: body.subcategory }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });

  invalidateRulesCache();
  return NextResponse.json({ data: rule, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transactionRule.delete({ where: { id: params.id } });
  invalidateRulesCache();
  return NextResponse.json({ data: null, error: null });
}
