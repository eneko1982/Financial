"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: "profit" | "loss" | "neutral";
}

export function KPICard({ title, value, change, changeLabel, subtitle, icon, accent }: KPICardProps) {
  const positive = change !== undefined ? change >= 0 : undefined;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              accent === "profit" && "text-emerald-400",
              accent === "loss" && "text-red-400",
            )}>
              {value}
            </p>
          </div>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50">
              {icon}
            </div>
          )}
        </div>
        {(change !== undefined || subtitle) && (
          <div className="mt-3 flex items-center gap-1.5">
            {change !== undefined && (
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                positive ? "text-emerald-400" : "text-red-400"
              )}>
                {positive ? <TrendingUp className="h-3 w-3" /> : change === 0 ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
            {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
