import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const account = await prisma.account.findUnique({ where: { id: params.id } });
  if (!account) return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: account, error: null });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const account = await prisma.account.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ data: account, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.account.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ data: null, error: null });
}
