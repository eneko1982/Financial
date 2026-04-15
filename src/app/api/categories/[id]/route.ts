import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, color } = body as { name?: string; color?: string };

  const data: { name?: string; color?: string | null } = {};
  if (name !== undefined) data.name = name.trim();
  if (color !== undefined) data.color = color || null;

  const category = await prisma.userCategory.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json({ data: category, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  // Children are cascade-deleted via the relation (onDelete: Cascade)
  await prisma.userCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ data: null, error: null });
}
