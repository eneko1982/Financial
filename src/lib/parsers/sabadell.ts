import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// Sabadell CSV export: "Fecha","Fecha Valor","Descripción","Importe","Divisa","Saldo disponible"
// Also supports: "Fecha","Concepto","Importe","Saldo"
export function parseSabadell(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const dateStr =
        row["Fecha Valor"] ??
        row["Fecha valor"] ??
        row["Fecha"] ??
        row["fecha"] ??
        "";
      const desc =
        row["Descripción"] ??
        row["Descripcion"] ??
        row["Concepto"] ??
        row["concepto"] ??
        "";
      const amtStr =
        row["Importe"] ??
        row["importe"] ??
        row["Importe (€)"] ??
        "";
      const balStr =
        row["Saldo disponible"] ??
        row["Saldo"] ??
        row["saldo"] ??
        "";

      const date = parseSpanishDate(dateStr);
      if (!date || !desc || !amtStr) continue;

      const amount = parseSpanishNumber(amtStr);
      const balance = balStr ? parseSpanishNumber(balStr) : undefined;
      const importHash = md5(`${date.toISOString().slice(0, 10)}|${amtStr}|${desc}`);

      transactions.push({
        date: date.toISOString(),
        description: desc.trim(),
        amount,
        balance,
        importHash,
        suggestedCategory: classifyTransaction(desc),
      });
    } catch (e) {
      errors.push(`Error: ${e}`);
    }
  }

  return { transactions, errors };
}
