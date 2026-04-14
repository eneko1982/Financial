import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const goal = await prisma.savingsGoal.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ data: goal, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.savingsGoal.delete({ where: { id: params.id } });
  return NextResponse.json({ data: null, error: null });
}
