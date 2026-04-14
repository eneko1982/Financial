"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import type { CashFlowPoint } from "@/types/financial";

interface CashFlowChartProps {
  data: CashFlowPoint[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Flujo de Caja (6 meses)</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => formatCurrency(v, true)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number, name: string) => [formatCurrency(v), name === "income" ? "Ingresos" : name === "expenses" ? "Gastos" : "Ahorro"]}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Legend formatter={(v) => v === "income" ? "Ingresos" : v === "expenses" ? "Gastos" : "Ahorro"} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
