/** Format a number as Spanish currency: 1234.56 → "1.234,56 €" */
function spanishCurrency(amount: number): string {
  const neg = amount < 0;
  const [intPart, decPart] = Math.abs(amount).toFixed(2).split(".");
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "-" : ""}${intFormatted},${decPart} €`;
}

/** Format a number as compact Spanish currency: 1234 → "1,2 K€" */
function spanishCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace(".", ",")} M€`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1).replace(".", ",")} mil €`;
  return spanishCurrency(amount);
}

export function formatCurrency(amount: number, compact = false): string {
  return compact ? spanishCompact(amount) : spanishCurrency(amount);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

export function formatChange(value: number): { text: string; positive: boolean } {
  return { text: spanishCurrency(Math.abs(value)), positive: value >= 0 };
}

/** Parse number string from either Spanish format "1.234,56" or plain JS "1234.56" */
export function parseSpanishNumber(str: string): number {
  if (!str) return 0;
  const s = str.trim();
  if (s.includes(",")) {
    const cleaned = s.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
    return parseFloat(cleaned) || 0;
  }
  return parseFloat(s.replace(/[^0-9.-]/g, "")) || 0;
}
