import type { ParsedTransaction } from "@/types/financial";
import { parseBBVA } from "./bbva";
import { parseSantander } from "./santander";
import { parseCaixaBank } from "./caixabank";
import { parseING } from "./ing";
import { parseSpanishDate } from "@/lib/utils/dates";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import md5 from "md5";

export type BankFormat = "bbva" | "santander" | "caixabank" | "ing" | "generic";

export interface ParserResult {
  transactions: ParsedTransaction[];
  errors: string[];
}

export function parseBank(rows: Record<string, string>[], format: BankFormat): ParserResult {
  switch (format) {
    case "bbva": return parseBBVA(rows);
    case "santander": return parseSantander(rows);
    case "caixabank": return parseCaixaBank(rows);
    case "ing": return parseING(rows);
    default: return parseGeneric(rows);
  }
}

function parseGeneric(rows: Record<string, string>[]): ParserResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];
  for (const row of rows) {
    try {
      const keys = Object.keys(row);
      const dateKey = keys.find((k) => /fecha|date/i.test(k));
      const descKey = keys.find((k) => /concepto|descripcion|description|nombre/i.test(k));
      const amtKey = keys.find((k) => /importe|amount|valor/i.test(k));
      if (!dateKey || !descKey || !amtKey) { errors.push("Columnas no reconocidas"); break; }

      const dateStr = row[dateKey];
      const desc = row[descKey];
      const amtStr = row[amtKey];
      const date = parseSpanishDate(dateStr);
      if (!date) { errors.push(`Fecha inválida: ${dateStr}`); continue; }
      const amount = parseSpanishNumber(amtStr);
      const importHash = md5(`${date.toISOString().slice(0, 10)}|${amtStr}|${desc}`);
      transactions.push({ date: date.toISOString(), description: desc, amount, importHash, suggestedCategory: classifyTransaction(desc) });
    } catch {
      errors.push(`Error en fila: ${JSON.stringify(row)}`);
    }
  }
  return { transactions, errors };
}
