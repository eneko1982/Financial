import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcGoalProgress } from "@/lib/utils/calculations";

export async function GET() {
  const goals = await prisma.savingsGoal.findMany({ orderBy: { createdAt: "asc" } });
  const enriched = goals.map((g) => ({ ...g, progress: calcGoalProgress(g.currentAmount, g.targetAmount) }));
  return NextResponse.json({ data: enriched, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const goal = await prisma.savingsGoal.create({ data: body });
  return NextResponse.json({ data: goal, error: null }, { status: 201 });
}
