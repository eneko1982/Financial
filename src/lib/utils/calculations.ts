export function calcSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

/**
 * Returns true if a transaction is an internal transfer between own accounts.
 * Internal transfers must be excluded from income/expense analysis to avoid
 * double-counting (e.g. a transfer from BBVA to ING would appear as both
 * an expense in BBVA and an income in ING).
 */
export function isInternalTransfer(category: string | null, description: string): boolean {
  const cat = (category ?? "").trim();
  const desc = description.trim();
  return (
    cat === "Movimientos excluidos" ||      // ING label for inter-account moves
    cat === "Transferencia interna" ||
    cat === "Traspaso" ||
    /^traspaso\b/i.test(desc) ||            // "Traspaso emitido a …"
    /^transferencia\s+interna\b/i.test(desc)
  );
}

export function calcTotalReturn(currentValue: number, costBasis: number): number {
  if (costBasis <= 0) return 0;
  return ((currentValue - costBasis) / costBasis) * 100;
}

export function calcGoalProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

export function calcNetWorth(assets: number, liabilities: number): number {
  return assets - liabilities;
}

export function calcBudgetPercent(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return (spent / budget) * 100;
}

/** Project months to reach goal given monthly contribution */
export function calcMonthsToGoal(
  current: number,
  target: number,
  monthlyContribution: number
): number | null {
  if (monthlyContribution <= 0) return null;
  const remaining = target - current;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlyContribution);
}
