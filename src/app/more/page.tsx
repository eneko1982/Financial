"use client";
import Link from "next/link";
import { Tag, TrendingUp, Target, Landmark, Bot, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TILES = [
  {
    href: "/categories",
    label: "Categorías",
    description: "Gestiona y edita tus categorías de gastos e ingresos",
    icon: Tag,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    href: "/investments",
    label: "Inversiones",
    description: "Seguimiento de tu cartera de inversiones y rentabilidad",
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    href: "/savings",
    label: "Objetivos",
    description: "Define y sigue el progreso de tus metas financieras",
    icon: Target,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    href: "/liabilities",
    label: "Deudas",
    description: "Controla tus préstamos, hipotecas y otras deudas",
    icon: Landmark,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    href: "/advisor",
    label: "Asesor IA",
    description: "Tu asistente financiero personal basado en inteligencia artificial",
    icon: Bot,
    color: "text-primary",
    bg: "bg-primary/10",
    badge: "IA",
  },
];

export default function MorePage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Más opciones</h1>
        <p className="text-sm text-muted-foreground mt-1">Todas las secciones de FinanceAI</p>
      </div>

      <div className="px-4 py-4 space-y-2">
        {TILES.map(({ href, label, description, icon: Icon, color, bg, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors active:scale-[0.98]"
          >
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl shrink-0", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{label}</span>
                {badge && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{badge}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}

      </div>
    </div>
  );
}
