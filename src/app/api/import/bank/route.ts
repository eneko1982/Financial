import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBank } from "@/lib/parsers";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { BankFormat } from "@/lib/parsers";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bankFormat = (formData.get("bankFormat") as BankFormat) ?? "generic";
  const accountId = formData.get("accountId") as string | null;

  if (!file || !accountId) {
    return NextResponse.json({ data: null, error: "Archivo y cuenta requeridos" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, string>[] = [];

  if (file.name.endsWith(".csv")) {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
    rows = result.data;
  } else {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: "" });
  }

  const { transactions, errors } = parseBank(rows, bankFormat);

  // Check duplicates
  const parsed = await Promise.all(
    transactions.map(async (tx) => {
      const exists = await prisma.transaction.findUnique({ where: { importHash: tx.importHash } });
      return { ...tx, isDuplicate: !!exists };
    })
  );

  return NextResponse.json({
    data: { parsed, duplicates: parsed.filter((t) => t.isDuplicate).length, errors },
    error: null,
  });
}
