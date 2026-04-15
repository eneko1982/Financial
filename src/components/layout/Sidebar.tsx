"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CreditCard, PieChart, TrendingUp,
  Target, Bot, Upload, X, Menu, Tag, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Cuentas", icon: CreditCard },
  { href: "/expenses", label: "Gastos", icon: PieChart },
  { href: "/categories", label: "Categorías", icon: Tag },
  { href: "/investments", label: "Inversiones", icon: TrendingUp },
  { href: "/savings", label: "Objetivos", icon: Target },
  { href: "/liabilities", label: "Deudas", icon: Landmark },
  { href: "/advisor", label: "Asesor IA", icon: Bot },
];

interface SidebarProps {
  onImport?: () => void;
}

export function Sidebar({ onImport }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight">FinanceAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
              {label}
              {href === "/advisor" && (
                <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">IA</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Import button */}
      <div className="border-t border-border p-3">
        <Button variant="outline" className="w-full gap-2" size="sm" onClick={onImport}>
          <Upload className="h-4 w-4" />
          Importar datos
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-card/50 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed bottom-4 right-4 z-40 lg:hidden flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
