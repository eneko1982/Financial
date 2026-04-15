import { prisma } from "./prisma";

export interface TransactionRule {
  id: string;
  name: string;
  pattern: string;
  matchType: string;
  category: string;
  subcategory: string | null;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory cache (60s TTL)
let _rulesCache: { rules: TransactionRule[]; expiresAt: number } | null = null;
const RULES_TTL = 60 * 1000;

export function invalidateRulesCache() {
  _rulesCache = null;
}

export async function getActiveRules(): Promise<TransactionRule[]> {
  const now = Date.now();
  if (_rulesCache && _rulesCache.expiresAt > now) return _rulesCache.rules;
  const rules = await prisma.transactionRule.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" },
  });
  _rulesCache = { rules, expiresAt: now + RULES_TTL };
  return rules;
}

export function applyRules(
  description: string,
  rules: TransactionRule[]
): { category: string; subcategory?: string } | null {
  for (const rule of rules) {
    const desc = description.toLowerCase();
    const pat = rule.pattern.toLowerCase();
    let matches = false;

    if (rule.matchType === "contains") {
      matches = desc.includes(pat);
    } else if (rule.matchType === "startsWith") {
      matches = desc.startsWith(pat);
    } else if (rule.matchType === "endsWith") {
      matches = desc.endsWith(pat);
    } else if (rule.matchType === "regex") {
      try {
        matches = new RegExp(rule.pattern, "i").test(description);
      } catch {
        matches = false;
      }
    }

    if (matches) {
      return {
        category: rule.category,
        subcategory: rule.subcategory ?? undefined,
      };
    }
  }
  return null;
}
