import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    // Mode A: explicit list of IDs
    ids?: string[];
    // Mode B: apply to all matching a filter (for "select all results" option)
    filter?: {
      accountId?: string;
      search?: string;
      category?: string;
      subcategory?: string;
      editedByUser?: boolean;
    };
    category: string;
    subcategory?: string | null;
  };

  if (!body.category) {
    return NextResponse.json({ data: null, error: "category es requerida" }, { status: 400 });
  }

  const data = {
    category: body.category,
    subcategory: body.subcategory ?? null,
    editedByUser: true,
  };

  let count = 0;

  if (body.ids?.length) {
    // Mode A: update specific IDs
    const result = await prisma.transaction.updateMany({
      where: { id: { in: body.ids } },
      data,
    });
    count = result.count;
  } else if (body.filter) {
    // Mode B: update all matching the filter
    const f = body.filter;
    const where: Record<string, unknown> = {};
    if (f.accountId) where.accountId = f.accountId;
    if (f.category) where.category = f.category;
    if (f.subcategory) where.subcategory = f.subcategory;
    if (f.editedByUser !== undefined) where.editedByUser = f.editedByUser;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (f.search) where.description = { contains: f.search, mode: "insensitive" } as any;

    const result = await prisma.transaction.updateMany({ where, data });
    count = result.count;
  } else {
    return NextResponse.json({ data: null, error: "ids o filter son requeridos" }, { status: 400 });
  }

  invalidateFinancialContext();
  return NextResponse.json({ data: { count }, error: null });
}
