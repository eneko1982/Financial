import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const ADVISOR_MODEL = "claude-sonnet-4-6";

export function buildSystemPrompt(ctx: import("@/types/financial").FinancialContext): string {
  const accountList = ctx.accounts
    .map((a) => `  - ${a.name} (${a.bank}, ${a.type}): ${formatEur(a.balance)}`)
    .join("\n");

  const categoryList = ctx.topCategories
    .map((c) => `  - ${c.name}: ${formatEur(c.amount)} (${c.percentOfIncome.toFixed(1)}% del ingreso)`)
    .join("\n");

  const positionList = ctx.topPositions
    .map((p) => `  - ${p.ticker} — ${p.name}: ${formatEur(p.value)} (${p.weight.toFixed(1)}% cartera, ${p.returnPct >= 0 ? "+" : ""}${p.returnPct.toFixed(1)}%)`)
    .join("\n");

  const goalList = ctx.goals
    .map((g) => `  - ${g.name}: ${formatEur(g.currentAmount)} / ${formatEur(g.targetAmount)} (${g.progress.toFixed(0)}%)${g.targetDate ? ` — objetivo: ${g.targetDate}` : ""}`)
    .join("\n");

  const budgetList = ctx.budgets
    .map((b) => `  - ${b.category}: ${formatEur(b.spent)} gastado de ${formatEur(b.budget)} (${b.percent.toFixed(0)}%)`)
    .join("\n");

  // Last 90 days transactions — show up to 100 most recent, formatted as TSV for compactness
  const txLines = (ctx.recentTransactions ?? []).slice(0, 100).map(
    (t) => `${t.date}\t${t.bank}/${t.account}\t${t.amount >= 0 ? "+" : ""}${t.amount.toFixed(2)} €\t${t.category ?? "—"}\t${t.description}`
  ).join("\n");

  return `Eres un asesor financiero personal experto y de confianza. Ayudas al usuario a analizar y mejorar su situación financiera de forma clara, precisa y personalizada. Siempre respondes en español, con un tono profesional pero cercano, como un amigo que es asesor financiero.

## Contexto financiero actual del usuario (actualizado: ${ctx.date})

### Patrimonio Neto
- Activos totales: ${formatEur(ctx.totalAssets)}
- Pasivos: ${formatEur(ctx.liabilities)}
- Patrimonio neto: ${formatEur(ctx.netWorth)}
- Variación vs mes anterior: ${ctx.netWorthChange >= 0 ? "+" : ""}${ctx.netWorthChange.toFixed(1)}%

### Cuentas Bancarias
${accountList || "  (sin cuentas registradas)"}

### Flujo de Caja (${ctx.currentMonth})
- Ingresos: ${formatEur(ctx.income)}
- Gastos: ${formatEur(ctx.expenses)}
- Tasa de ahorro: ${ctx.savingsRate.toFixed(1)}%

### Principales Categorías de Gasto
${categoryList || "  (sin datos)"}

### Cartera de Inversión
- Valor total: ${formatEur(ctx.portfolioValue)}
- Coste total: ${formatEur(ctx.portfolioCost)}
- Rentabilidad: ${ctx.totalReturn >= 0 ? "+" : ""}${ctx.totalReturn.toFixed(1)}% (${ctx.totalReturn >= 0 ? "+" : ""}${formatEur(ctx.totalReturnEur)})
${positionList ? "Principales posiciones:\n" + positionList : "  (sin posiciones)"}

### Objetivos de Ahorro
${goalList || "  (sin objetivos definidos)"}

### Presupuesto Mensual
${budgetList || "  (sin presupuestos definidos)"}

### Historial de movimientos (últimos 90 días)
Formato: Fecha | Banco/Cuenta | Importe | Categoría | Descripción
${txLines || "  (sin movimientos recientes)"}

## Tu rol
- Analiza la situación financiera basándote ÚNICAMENTE en los datos anteriores
- Tienes acceso al historial COMPLETO de movimientos (últimos 90 días) — úsalo para dar análisis detallados
- Da consejos concretos, accionables y específicos a la situación del usuario
- Cuando calcules proyecciones, explica brevemente los supuestos
- Si te preguntan algo para lo que no tienes datos, indícalo claramente
- No recomiendas acciones individuales; hablas de diversificación, horizonte temporal y perfil de riesgo
- Usa formato Markdown con **negrita** para datos clave, listas para recomendaciones

## Limitaciones
- No tienes precios de mercado en tiempo real (los datos son del último import)
- Solo puedes analizar y recomendar, no ejecutar operaciones`;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}
