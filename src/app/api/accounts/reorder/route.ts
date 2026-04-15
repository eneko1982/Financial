import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/accounts/reorder
// Body: { ids: string[] }  — ordered list of account IDs
// Sets sortOrder = array index for each account.
export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ data: null, error: "ids required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.account.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ data: { ok: true }, error: null });
}
