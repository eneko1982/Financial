import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveRules, applyRules } from "@/lib/transaction-rules";
import { invalidateFinancialContext } from "@/lib/financial-context";

export async function POST() {
  const rules = await getActiveRules();
  if (rules.length === 0) {
    return NextResponse.json({ data: { count: 0 }, error: null });
  }

  const unedited = await prisma.transaction.findMany({
    where: { editedByUser: false },
    select: { id: true, description: true },
  });

  let count = 0;
  for (const tx of unedited) {
    const match = applyRules(tx.description, rules);
    if (match) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          category: match.category,
          subcategory: match.subcategory ?? null,
        },
      });
      count++;
    }
  }

  invalidateFinancialContext();
  return NextResponse.json({ data: { count }, error: null });
}
