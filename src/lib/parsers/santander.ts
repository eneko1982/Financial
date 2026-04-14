import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// Santander: "Fecha","Concepto","Importe","Saldo"
export function parseSantander(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const dateStr = row["Fecha"] ?? row["Fecha operacion"] ?? row["Fecha Operación"] ?? "";
      const desc = row["Concepto"] ?? row["Descripcion"] ?? row["Descripción"] ?? "";
      const amtStr = row["Importe"] ?? row["Importe (EUR)"] ?? "";
      const balStr = row["Saldo"] ?? row["Saldo (EUR)"] ?? "";

      const date = parseSpanishDate(dateStr);
      if (!date || !desc || !amtStr) continue;

      const amount = parseSpanishNumber(amtStr);
      const balance = balStr ? parseSpanishNumber(balStr) : undefined;
      const importHash = md5(`${date.toISOString().slice(0, 10)}|${amtStr}|${desc}`);

      transactions.push({ date: date.toISOString(), description: desc.trim(), amount, balance, importHash, suggestedCategory: classifyTransaction(desc) });
    } catch (e) {
      errors.push(`Error: ${e}`);
    }
  }
  return { transactions, errors };
}
