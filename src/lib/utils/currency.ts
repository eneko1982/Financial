const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurCompactFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const pctFormatter = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function formatCurrency(amount: number, compact = false): string {
  return compact ? eurCompactFormatter.format(amount) : eurFormatter.format(amount);
}

export function formatPercent(value: number): string {
  return pctFormatter.format(value / 100);
}

export function formatChange(value: number): { text: string; positive: boolean } {
  const positive = value >= 0;
  return {
    text: formatCurrency(Math.abs(value)),
    positive,
  };
}

/** Parse Spanish number format "1.234,56" → 1234.56 */
export function parseSpanishNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}
