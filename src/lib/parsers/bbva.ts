import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// BBVA CSV columns: "F. Valor","Concepto","Importe","Disponible"
// or "Fecha operación","Fecha valor","Descripción","Importe (€)","Saldo (€)"
export function parseBBVA(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const dateStr = row["F.Valor"] ?? row["F. Valor"] ?? row["Fecha valor"] ?? row["Fecha"] ?? row["Fecha operación"] ?? "";
      const desc = row["Concepto"] ?? row["Descripción"] ?? row["Descripcion"] ?? "";
      const amtStr = row["Importe"] ?? row["Importe (€)"] ?? row["Importe(€)"] ?? "";
      const balStr = row["Disponible"] ?? row["Saldo (€)"] ?? row["Saldo(€)"] ?? "";

      const date = parseSpanishDate(dateStr);
      if (!date || !desc || !amtStr) {
        if (dateStr || desc || amtStr) errors.push(`Fila omitida: ${JSON.stringify(row)}`);
        continue;
      }

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
