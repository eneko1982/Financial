export type AccountType = "checking" | "savings" | "investment" | "credit";
export type BankName = "BBVA" | "Santander" | "CaixaBank" | "ING" | "Sabadell" | "Bankinter" | "Otro";
export type BrokerName = "IBKR" | "Degiro" | "XTB" | "eToro" | "Otro";
export type AssetClass = "stocks" | "etf" | "bonds" | "crypto" | "cash" | "other";
export type InvestmentTxType = "buy" | "sell" | "dividend" | "split";
export type GoalCategory = "emergency" | "travel" | "purchase" | "retirement" | "education" | "other";

export interface KPIData {
  netWorth: number;
  netWorthChange: number;
  savingsRate: number;
  savingsRateChange: number;
  portfolioReturn: number;
  portfolioReturnChange: number;
  monthlyExpenses: number;
  monthlyExpensesChange: number;
  monthlyIncome: number;
  monthlySavings: number;
}

export interface NetWorthPoint {
  date: string;
  netWorth: number;
  assets: number;
}

export interface CashFlowPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  budget: number | null;
  color: string;
  percentage: number;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  importHash: string;
  isDuplicate?: boolean;
  suggestedCategory?: string;
}

export interface RecentTransaction {
  date: string;
  description: string;
  amount: number;
  category: string | null;
  subcategory: string | null;
  account: string;
  bank: string;
}

export interface FinancialContext {
  date: string;
  netWorth: number;
  netWorthChange: number;
  totalAssets: number;
  liabilities: number;
  accounts: { name: string; bank: string; balance: number; type: string }[];
  currentMonth: string;
  income: number;
  expenses: number;
  savingsRate: number;
  topCategories: { name: string; amount: number; percentOfIncome: number }[];
  portfolioValue: number;
  portfolioCost: number;
  totalReturn: number;
  totalReturnEur: number;
  topPositions: { ticker: string; name: string; value: number; weight: number; returnPct: number }[];
  goals: { name: string; currentAmount: number; targetAmount: number; progress: number; targetDate?: string }[];
  budgets: { category: string; budget: number; spent: number; percent: number }[];
  recentTransactions: RecentTransaction[];
  historyStart: string; // label like "enero 2026" used in system prompt
}
