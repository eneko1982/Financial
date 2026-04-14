import md5 from "md5";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// CaixaBank exports:
// - ES Excel: "Fecha","Fecha valor","Movimiento","Más datos","Importe","Saldo"
// - Catalan Excel: "Data operació","Concepte","Import","Saldo"
export function parseCaixaBank(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const dateStr =
        row["Fecha"] ?? row["Data operació"] ?? row["Fecha operación"] ?? row["Data"] ?? "";
      const movimiento = row["Movimiento"] ?? row["Concepte"] ?? row["Concepto"] ?? row["Descripció"] ?? row["Descripción"] ?? "";
      const masDatos = row["Más datos"] ?? row["Mas datos"] ?? "";
      // Combine Movimiento + Más datos for a richer description
      const desc = masDatos ? `${movimiento} - ${masDatos}` : movimiento;
      const amtStr = row["Importe"] ?? row["Import"] ?? row["Import (€)"] ?? "";
      const balStr = row["Saldo"] ?? row["Saldo (€)"] ?? "";

      const date = parseSpanishDate(dateStr);
      if (!date || !movimiento || !amtStr) continue;

      const amount = parseSpanishNumber(amtStr);
      const balance = balStr ? parseSpanishNumber(balStr) : undefined;
      const importHash = md5(`${date.toISOString().slice(0, 10)}|${amtStr}|${movimiento}`);

      transactions.push({ date: date.toISOString(), description: desc.trim(), amount, balance, importHash, suggestedCategory: classifyTransaction(desc) });
    } catch (e) {
      errors.push(`Error: ${e}`);
    }
  }
  return { transactions, errors };
}
