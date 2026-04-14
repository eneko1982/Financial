import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// CaixaBank: "Data operació","Concepte","Import","Saldo"  or ES version
export function parseCaixaBank(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const dateStr = row["Data operació"] ?? row["Fecha operación"] ?? row["Fecha"] ?? row["Data"] ?? "";
      const desc = row["Concepte"] ?? row["Concepto"] ?? row["Descripció"] ?? row["Descripción"] ?? "";
      const amtStr = row["Import"] ?? row["Importe"] ?? row["Import (€)"] ?? "";
      const balStr = row["Saldo"] ?? row["Saldo (€)"] ?? "";

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
