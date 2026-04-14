import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { category, notes } = body;
  const tx = await prisma.transaction.update({ where: { id: params.id }, data: { category, notes } });
  return NextResponse.json({ data: tx, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ data: null, error: null });
}
