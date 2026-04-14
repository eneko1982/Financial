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
    // Parse without headers first to detect and skip metadata rows
    const rawResult = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true, dynamicTyping: false });
    const rawRows = rawResult.data;

    // Find the actual header row: first row with at least 3 non-empty cells
    let headerIdx = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const nonEmpty = rawRows[i].filter((c) => String(c ?? "").trim() !== "").length;
      if (nonEmpty >= 4) { headerIdx = i; break; }
    }

    const csvHeaders = rawRows[headerIdx].map((h) => String(h ?? "").trim());
    rows = rawRows
      .slice(headerIdx + 1)
      .filter((row) => row.some((c) => String(c ?? "").trim() !== ""))
      .map((row) => {
        const obj: Record<string, string> = {};
        csvHeaders.forEach((h, i) => { if (h) obj[h] = String(row[i] ?? "").trim(); });
        return obj;
      });
  } else {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Use raw: true + cellDates: true so numbers come as JS numbers (not locale-formatted strings)
    // This avoids parseSpanishNumber misinterpreting "-53.90" (dot decimal) as "-5390"
    // cellDates is set at read() time, so sheet_to_json just needs raw: true
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" }) as unknown[][];

    // Find the actual header row: first row with at least 3 non-empty cells
    // (skips metadata rows like "Últimos movimientos" or the IBAN title in CaixaBank)
    let headerIdx = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const nonEmpty = (rawRows[i] as unknown[]).filter((c) => String(c ?? "").trim() !== "").length;
      if (nonEmpty >= 4) { headerIdx = i; break; }
    }

    const headers = (rawRows[headerIdx] as unknown[]).map((h) => String(h ?? "").trim());
    rows = (rawRows.slice(headerIdx + 1) as unknown[][])
      .filter((row) => row.some((c) => String(c ?? "").trim() !== ""))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (!h) return;
          const val = row[i];
          if (val instanceof Date) {
            // Format date as DD/MM/YYYY for parseSpanishDate
            const d = val;
            obj[h] = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          } else if (typeof val === "number") {
            // Raw JS number — convert directly, no Spanish formatting needed
            obj[h] = String(val);
          } else {
            obj[h] = String(val ?? "").trim();
          }
        });
        return obj;
      });
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
