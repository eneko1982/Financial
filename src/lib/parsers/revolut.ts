import md5 from "md5";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { classifyTransaction } from "@/lib/category-classifier";
import type { ParsedTransaction } from "@/types/financial";
import type { ParserResult } from "./index";

// Revolut CSV export columns:
// Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
// Amounts already have sign (negative = debit). Dates are ISO: "2024-03-15 10:23:45"
export function parseRevolut(rows: Record<string, string>[]): ParserResult {
  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      // Only process completed transactions
      const state = (row["State"] ?? row["state"] ?? "").toLowerCase();
      if (state && state !== "completed") continue;

      const dateStr =
        row["Completed Date"] ??
        row["Started Date"] ??
        row["Date"] ??
        "";
      const desc =
        row["Description"] ??
        row["description"] ??
        row["Name"] ??
        "";
      const amtStr =
        row["Amount"] ??
        row["amount"] ??
        "";
      const balStr =
        row["Balance"] ??
        row["balance"] ??
        "";

      if (!dateStr || !desc || !amtStr) continue;

      // Revolut dates: "2024-03-15 10:23:45" or "2024-03-15T10:23:45"
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push(`Fecha inválida: ${dateStr}`);
        continue;
      }

      // Revolut amounts use dot as decimal separator
      const amount = parseSpanishNumber(amtStr.replace(/,/g, ""));
      const balance = balStr ? parseSpanishNumber(balStr.replace(/,/g, "")) : undefined;
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
