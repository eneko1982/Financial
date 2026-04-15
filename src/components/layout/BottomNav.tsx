"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ArrowLeftRight, Plus, BarChart2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur border-t border-border safe-bottom">
      <div className="flex items-end justify-around h-16 px-1">
        <NavItem href="/dashboard" label="Inicio" icon={Home} active={isActive("/dashboard") || pathname === "/"} />
        <NavItem href="/accounts" label="Movimientos" icon={ArrowLeftRight} active={isActive("/accounts")} />

        {/* FAB center button */}
        <div className="flex flex-col items-center -mt-5 pb-1">
          <button
            onClick={onAdd}
            className="flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 active:scale-95 transition-transform"
            aria-label="Añadir movimiento"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Añadir</span>
        </div>

        <NavItem href="/expenses" label="Informes" icon={BarChart2} active={isActive("/expenses")} />
        <NavItem href="/more" label="Más" icon={LayoutGrid} active={isActive("/more")} />
      </div>
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, active }: {
  href: string; label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link href={href} className={cn(
      "flex flex-col items-center justify-center gap-0.5 min-w-[52px] h-full pt-2",
      active ? "text-primary" : "text-muted-foreground"
    )}>
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
