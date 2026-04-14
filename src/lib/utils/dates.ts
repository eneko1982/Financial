import { format, parse, isValid, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy");
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d 'de' MMMM yyyy", { locale: es });
}

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM yyyy", { locale: es });
}

export function formatMonthShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM", { locale: es });
}

/** Parse Spanish date DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY */
export function parseSpanishDate(str: string): Date | null {
  if (!str) return null;
  const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy", "dd-MM-yy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    const parsed = parse(str.trim(), fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  // Try native Date
  const native = new Date(str);
  return isValid(native) ? native : null;
}

export function currentMonthLabel(): string {
  return format(new Date(), "MMMM yyyy", { locale: es });
}

export function getPeriodLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, "MMMM yyyy", { locale: es });
}

export function getLastNMonths(n: number): { start: Date; end: Date; label: string }[] {
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    result.push({
      start: startOfMonth(d),
      end: endOfMonth(d),
      label: format(d, "MMM", { locale: es }),
    });
  }
  return result;
}
