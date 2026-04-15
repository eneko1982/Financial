import { NextResponse } from "next/server";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST() {
  invalidateFinancialContext();
  return NextResponse.json({ data: { invalidated: true }, error: null });
}
