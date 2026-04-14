import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// ING Excel: "F. VALOR","CATEGORÍA","SUBCATEGORÍA","DESCRIPCIÓN","COMENTARIO","IMPORTE (€)","SALDO (€)"
// ING CSV:   "Fecha","Nombre","Categoría","Subcategoría","Importe (€)","Saldo (€)"
export function parseING(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      // Support both Excel (uppercase, "F. VALOR") and CSV ("Fecha") column names
      const dateStr = row["F. VALOR"] ?? row["F.VALOR"] ?? row["Fecha"] ?? row["Fecha Valor"] ?? "";
      const desc =
        row["DESCRIPCIÓN"] ?? row["Descripción"] ?? row["Nombre"] ?? row["Concepto"] ?? "";
      const amtStr = row["IMPORTE (€)"] ?? row["Importe (€)"] ?? row["Importe"] ?? "";
      const balStr = row["SALDO (€)"] ?? row["Saldo (€)"] ?? row["Saldo"] ?? "";
      // ING provides its own category — use it if available
      const ingCategory =
        row["CATEGORÍA"] ?? row["Categoría"] ?? row["Categoria"] ?? "";

      const date = parseSpanishDate(dateStr);
      if (!date || !desc || !amtStr) continue;

      const amount = parseSpanishNumber(amtStr);
      const balance = balStr ? parseSpanishNumber(balStr) : undefined;
      const importHash = md5(`${date.toISOString().slice(0, 10)}|${amtStr}|${desc}`);
      const suggested = ingCategory || classifyTransaction(desc);

      transactions.push({ date: date.toISOString(), description: desc.trim(), amount, balance, importHash, suggestedCategory: suggested });
    } catch (e) {
      errors.push(`Error: ${e}`);
    }
  }
  return { transactions, errors };
}
