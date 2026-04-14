export function calcSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
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
