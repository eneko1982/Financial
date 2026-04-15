import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.userCategory.findMany({
    where: { parentId: null },
    include: {
      children: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: categories, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, parentId, color, type } = body as { name: string; parentId?: string; color?: string; type?: string };

  if (!name?.trim()) {
    return NextResponse.json({ data: null, error: "name is required" }, { status: 400 });
  }

  const category = await prisma.userCategory.create({
    data: {
      name: name.trim(),
      parentId: parentId ?? null,
      color: color ?? null,
      type: parentId ? "both" : (type ?? "both"),
    },
  });
  return NextResponse.json({ data: category, error: null }, { status: 201 });
}
