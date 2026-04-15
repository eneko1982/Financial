import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { descriptionPattern, category, subcategory } = await req.json() as {
    descriptionPattern: string;
    category: string;
    subcategory?: string | null;
  };

  if (!descriptionPattern || !category) {
    return NextResponse.json({ data: null, error: "descriptionPattern and category are required" }, { status: 400 });
  }

  const result = await prisma.transaction.updateMany({
    where: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: { contains: descriptionPattern, mode: "insensitive" } as any,
      editedByUser: false, // never overwrite manually-edited transactions
    },
    data: {
      category,
      subcategory: subcategory ?? null,
    },
  });

  return NextResponse.json({ data: { count: result.count }, error: null });
}
