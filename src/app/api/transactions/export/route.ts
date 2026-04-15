import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId");
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (accountId) where.accountId = accountId;
  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: 10000,
    select: {
      date: true,
      description: true,
      amount: true,
      category: true,
      subcategory: true,
      notes: true,
      account: { select: { name: true, bank: true } },
    },
  });

  const escape = (v: string | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const rows = [
    ["Fecha", "Descripción", "Importe", "Categoría", "Subcategoría", "Banco", "Cuenta", "Notas"].join(","),
    ...transactions.map(t => [
      escape(new Date(t.date).toLocaleDateString("es-ES")),
      escape(t.description),
      escape(t.amount.toFixed(2)),
      escape(t.category),
      escape(t.subcategory),
      escape(t.account.bank),
      escape(t.account.name),
      escape(t.notes),
    ].join(",")),
  ];

  const csv = rows.join("\n");
  const dateLabel = dateFrom ? dateFrom.slice(0, 7) : new Date().toISOString().slice(0, 7);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transacciones-${dateLabel}.csv"`,
    },
  });
}
