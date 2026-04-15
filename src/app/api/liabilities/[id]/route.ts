import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as {
    name?: string;
    type?: string;
    balance?: number;
    interestRate?: number | null;
    monthlyPayment?: number | null;
    lender?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    notes?: string | null;
  };

  const liability = await prisma.liability.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.balance !== undefined && { balance: body.balance }),
      ...(body.interestRate !== undefined && { interestRate: body.interestRate }),
      ...(body.monthlyPayment !== undefined && { monthlyPayment: body.monthlyPayment }),
      ...(body.lender !== undefined && { lender: body.lender }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  invalidateFinancialContext();
  return NextResponse.json({ data: liability, error: null });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.liability.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  invalidateFinancialContext();
  return NextResponse.json({ data: null, error: null });
}
