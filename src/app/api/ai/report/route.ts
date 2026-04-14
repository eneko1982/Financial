import { NextRequest, NextResponse } from "next/server";
import { anthropic, ADVISOR_MODEL, buildSystemPrompt } from "@/lib/claude";
import { buildFinancialContext } from "@/lib/financial-context";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { period } = await req.json(); // "2025-03"

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your-api-key-here") {
    return NextResponse.json({ data: null, error: "ANTHROPIC_API_KEY no configurada" }, { status: 400 });
  }

  const existing = await prisma.aIReport.findUnique({ where: { period } });
  if (existing) return NextResponse.json({ data: existing, error: null });

  const context = await buildFinancialContext();
  const systemPrompt = buildSystemPrompt(context);

  const response = await anthropic.messages.create({
    model: ADVISOR_MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Genera un informe financiero mensual completo para el período ${period}. Incluye:
1. **Resumen ejecutivo** (3-4 líneas clave)
2. **Análisis de gastos**: categorías principales, comparativa con presupuesto
3. **Situación patrimonial**: evolución del patrimonio neto
4. **Cartera de inversión**: rendimiento y diversificación
5. **Progreso en objetivos de ahorro**
6. **Recomendaciones para el próximo mes** (lista de acciones concretas)

Usa formato Markdown con encabezados y listas.`,
    }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";
  const summary = content.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 150) ?? "";

  const report = await prisma.aIReport.create({ data: { period, content, summary } });

  return NextResponse.json({ data: report, error: null });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = searchParams.get("period");
  if (!period) return NextResponse.json({ data: null, error: "period required" }, { status: 400 });
  const report = await prisma.aIReport.findUnique({ where: { period } });
  return NextResponse.json({ data: report, error: null });
}
