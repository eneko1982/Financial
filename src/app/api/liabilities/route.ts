import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const liabilities = await prisma.liability.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: liabilities, error: null });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string;
    type: string;
    balance: number;
    interestRate?: number | null;
    monthlyPayment?: number | null;
    lender?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  };

  if (!body.name || !body.type || body.balance === undefined) {
    return NextResponse.json({ data: null, error: "name, type y balance son requeridos" }, { status: 400 });
  }

  const liability = await prisma.liability.create({
    data: {
      name: body.name,
      type: body.type,
      balance: body.balance,
      interestRate: body.interestRate ?? null,
      monthlyPayment: body.monthlyPayment ?? null,
      lender: body.lender ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json({ data: liability, error: null });
}
