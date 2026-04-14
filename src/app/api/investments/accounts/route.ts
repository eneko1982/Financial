import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accounts = await prisma.investmentAccount.findMany();
  return NextResponse.json({ data: accounts, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const account = await prisma.investmentAccount.create({ data: body });
  return NextResponse.json({ data: account, error: null }, { status: 201 });
}
