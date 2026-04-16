"use client";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from "recharts";
import { Header } from "@/components/layout/Header";
import { useInvestmentPositions } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/currency";
import { parseSpanishNumber } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp, TrendingDown, ClipboardPaste, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

const ASSET_COLORS: Record<string, string> = {
  stocks: "#22c55e", etf: "#3b82f6", bonds: "#f59e0b", crypto: "#a855f7", cash: "#06b6d4", other: "#6b7280",
};
const ASSET_LABELS: Record<string, string> = {
  stocks: "Acciones", etf: "ETF", bonds: "Bonos", crypto: "Cripto", cash: "Efectivo", other: "Otro",
};
const CHART_PALETTE = [
  "#6366f1","#22d3ee","#a3e635","#fb923c","#f472b6",
  "#34d399","#fbbf24","#60a5fa","#c084fc","#f87171",
  "#2dd4bf","#e879f9","#4ade80","#38bdf8","#facc15",
];
type ChartView = "class" | "position" | "country";
interface ChartEntry { key: string; label: string; value: number; pct: number; color: string; }
const VIEW_LABELS: Record<ChartView, string> = { class: "Clase", position: "Posición", country: "País" };

export default function InvestmentsPage() {
  const { data: posData, isLoading: posLoading } = useInvestmentPositions();
  const positions = posData?.data ?? [];
  const totalValue = posData?.totalValue ?? 0;
  const usdEurRate = posData?.usdEurRate ?? null;
  const hasUsdPositions = positions.some(p => p.currency === "USD");
  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editPos, setEditPos] = useState<(typeof positions)[0] | null>(null);
  const [posSearch, setPosSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"ticker" | "currentValue" | "pnlPct" | "weight">("currentValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const qc = useQueryClient();

  async function handleDelete(id: string) {
    await fetch(`/api/investments/positions/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["investments"] });
  }

  const filteredPositions = positions
    .filter(p => classFilter === "all" || (p.assetClass ?? "other") === classFilter)
    .filter(p => !posSearch || p.ticker.toUpperCase().includes(posSearch.toUpperCase()) || p.name.toLowerCase().includes(posSearch.toLowerCase()))
    .sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortKey === "ticker") return mult * a.ticker.localeCompare(b.ticker);
      if (sortKey === "currentValue") return mult * (a.currentValue - b.currentValue);
      if (sortKey === "pnlPct") return mult * (a.pnlPct - b.pnlPct);
      if (sortKey === "weight") return mult * (a.weight - b.weight);
      return 0;
    });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const assetClasses = ["all", ...Array.from(new Set(positions.map(p => p.assetClass ?? "other")))];

  return (
    <div className="max-w-2xl mx-auto lg:max-w-7xl">

      {/* ── Gradient header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-500/15 to-slate-900 px-5 pt-12 pb-6 space-y-4">

        {/* Title + action buttons */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Cartera</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20 transition-colors"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Broker</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Añadir</span>
            </button>
          </div>
        </div>

        {/* Hero value */}
        {posLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-48 bg-white/10" />
            <Skeleton className="h-5 w-32 bg-white/10" />
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-white/50 uppercase tracking-widest font-medium mb-0.5">Valor total</p>
            <p className="text-3xl font-bold text-white tabular-nums leading-tight">{formatCurrency(totalValue)}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {totalPnl >= 0
                ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                : <TrendingDown className="h-4 w-4 text-red-400" />}
              <span className={cn("text-sm font-semibold tabular-nums", totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
              </span>
              <span className={cn("text-sm font-semibold tabular-nums", totalPnlPct >= 0 ? "text-emerald-400" : "text-red-400")}>
                ({totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        )}

        {/* Mini stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/8 backdrop-blur p-3 space-y-0.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Coste total</p>
            <p className="text-base font-bold text-white tabular-nums leading-tight">
              {posLoading ? "—" : formatCurrency(totalCost)}
            </p>
          </div>
          <div className="rounded-xl bg-white/8 backdrop-blur p-3 space-y-0.5">
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Posiciones</p>
            <p className="text-base font-bold text-white leading-tight">
              {posLoading ? "—" : positions.length}
            </p>
          </div>
        </div>

        {/* USD/EUR rate badge — only shown when there are USD positions */}
        {hasUsdPositions && usdEurRate && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1">
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">USD/EUR</span>
              <span className="text-[11px] font-bold text-amber-200 tabular-nums">{usdEurRate.toFixed(4)}</span>
            </div>
            <span className="text-[10px] text-white/40">Valores en USD convertidos a €</span>
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* ── Allocation chart ── */}
        <AllocationChart positions={positions} totalValue={totalValue} />

        {/* ── Positions section ── */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Posiciones</h2>
            {/* Desktop search */}
            <Input
              placeholder="Buscar ticker o nombre..."
              value={posSearch}
              onChange={e => setPosSearch(e.target.value)}
              className="hidden lg:flex h-8 w-52 text-xs"
            />
          </div>

          {/* Asset class filter pills — mobile only */}
          {assetClasses.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden -mx-4 px-4 scrollbar-none mb-3">
              {assetClasses.map(cls => (
                <button
                  key={cls}
                  onClick={() => setClassFilter(cls)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    classFilter === cls
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cls !== "all" && (
                    <span className="h-2 w-2 rounded-full" style={{ background: ASSET_COLORS[cls] ?? "#6b7280" }} />
                  )}
                  {cls === "all" ? "Todos" : ASSET_LABELS[cls] ?? cls}
                </button>
              ))}
            </div>
          )}

          {/* ── MOBILE: cards ── */}
          <div className="space-y-2 lg:hidden">
            {posLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : filteredPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-10 gap-3">
                <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No hay posiciones</p>
                <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Añadir primera posición
                </Button>
              </div>
            ) : (
              filteredPositions.map((p) => {
                const color = ASSET_COLORS[p.assetClass ?? "other"];
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Asset class dot */}
                      <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: color + "22" }}>
                        <span className="h-4 w-4 rounded-full" style={{ background: color }} />
                      </div>

                      {/* Left: ticker + name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-bold text-sm">{p.ticker}</span>
                          <span className="text-[10px] font-medium rounded-full px-1.5 py-px"
                            style={{ background: color + "22", color }}>
                            {ASSET_LABELS[p.assetClass ?? "other"] ?? p.assetClass}
                          </span>
                          {p.currency === "USD" && (
                            <span className="text-[9px] font-bold rounded-full px-1.5 py-px bg-amber-400/15 text-amber-400 border border-amber-400/30">USD</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate leading-tight">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {p.shares >= 100 ? p.shares.toFixed(2) : p.shares.toFixed(4)} acc · {p.weight.toFixed(1)}% cartera
                        </p>
                      </div>

                      {/* Right: value + P&L */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold tabular-nums">{formatCurrency(p.currentValue)}</p>
                        <p className={cn("text-xs font-semibold tabular-nums flex items-center justify-end gap-0.5", p.pnlPct >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {p.pnlPct >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                        </p>
                        <p className={cn("text-[11px] tabular-nums", p.pnlEur >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {p.pnlEur >= 0 ? "+" : ""}{formatCurrency(p.pnlEur)}
                        </p>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1 hover:bg-muted transition-colors shrink-0 ml-1">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => setEditPos(p)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {/* Weight bar */}
                    <div className="h-0.5 bg-muted">
                      <div className="h-full transition-all" style={{ width: `${Math.min(p.weight, 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── DESKTOP: table ── */}
          <div className="hidden lg:block rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}>
                <ClipboardPaste className="h-3.5 w-3.5" />Pegar desde broker
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />Añadir posición
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      <button onClick={() => toggleSort("ticker")} className="flex items-center gap-1 hover:text-foreground transition-colors">Ticker<SortIcon col="ticker" /></button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clase</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Coste medio</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      <button onClick={() => toggleSort("currentValue")} className="flex items-center justify-end gap-1 w-full hover:text-foreground transition-colors">Valor actual<SortIcon col="currentValue" /></button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      <button onClick={() => toggleSort("pnlPct")} className="flex items-center justify-end gap-1 w-full hover:text-foreground transition-colors">P&L<SortIcon col="pnlPct" /></button>
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                      <button onClick={() => toggleSort("weight")} className="flex items-center justify-end gap-1 w-full hover:text-foreground transition-colors">Peso<SortIcon col="weight" /></button>
                    </th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {posLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-t border-border">
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    : filteredPositions.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          {p.ticker}
                          {p.currency === "USD" && (
                            <span className="text-[9px] font-bold rounded-full px-1.5 py-px bg-amber-400/15 text-amber-400 border border-amber-400/30">USD</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">{p.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]" style={{ background: `${ASSET_COLORS[p.assetClass ?? "other"]}20`, color: ASSET_COLORS[p.assetClass ?? "other"] }}>{p.assetClass ?? "other"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{p.shares.toFixed(4)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(p.averageCost)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{formatCurrency(p.currentValue)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className={cn("flex items-center justify-end gap-1 font-mono tabular-nums text-xs", p.pnlPct >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {p.pnlPct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {p.pnlPct >= 0 ? "+" : ""}{p.pnlPct.toFixed(2)}%
                        </div>
                        <div className={cn("text-xs font-mono tabular-nums", p.pnlEur >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {p.pnlEur >= 0 ? "+" : ""}{formatCurrency(p.pnlEur)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono tabular-nums">{p.weight.toFixed(1)}%</td>
                      <td className="px-2 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1 hover:bg-muted transition-colors">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => setEditPos(p)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => handleDelete(p.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {!posLoading && positions.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No hay posiciones. Añade tu primera inversión.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      <AddPositionDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      {editPos && <EditPositionDialog position={editPos} onClose={() => setEditPos(null)} />}
    </div>
  );
}

/* ─── Allocation chart ──────────────────────────────────────────────────── */

type PositionForChart = {
  id: string; ticker: string; assetClass: string | null;
  country: string | null; currentValue: number;
};

function AllocationChart({ positions, totalValue }: { positions: PositionForChart[]; totalValue: number }) {
  const [view, setView] = useState<ChartView>("class");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo((): ChartEntry[] => {
    if (totalValue === 0 || positions.length === 0) return [];

    if (view === "class") {
      const groups: Record<string, number> = {};
      positions.forEach(p => { const k = p.assetClass ?? "other"; groups[k] = (groups[k] ?? 0) + p.currentValue; });
      return Object.entries(groups)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ key: k, label: ASSET_LABELS[k] ?? k, value: v, pct: (v / totalValue) * 100, color: ASSET_COLORS[k] ?? "#6b7280" }));
    }

    if (view === "position") {
      return [...positions]
        .sort((a, b) => b.currentValue - a.currentValue)
        .map((p, i) => ({ key: p.id, label: p.ticker, value: p.currentValue, pct: (p.currentValue / totalValue) * 100, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
    }

    // country
    const groups: Record<string, number> = {};
    positions.forEach(p => { const k = p.country?.trim() || "Sin región"; groups[k] = (groups[k] ?? 0) + p.currentValue; });
    return Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v], i) => ({ key: k, label: k, value: v, pct: (v / totalValue) * 100, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
  }, [view, positions, totalValue]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 9} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} innerRadius={outerRadius + 13} outerRadius={outerRadius + 17} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.45} />
        <text x={cx} y={cy - 14} textAnchor="middle" fill="white" fontSize={13} fontWeight="700">{payload.label}</text>
        <text x={cx} y={cy + 4}  textAnchor="middle" fill="#9ca3af" fontSize={11}>{formatCurrency(payload.value)}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill={fill} fontSize={13} fontWeight="700">{(percent * 100).toFixed(1)}%</text>
      </g>
    );
  };

  if (positions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Asignación de cartera
          </CardTitle>
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] shrink-0">
            {(["class", "position", "country"] as ChartView[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setActiveIndex(null); }}
                className={cn(
                  "px-3 py-1.5 font-medium transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-4 items-start">

          {/* ── Donut chart ── */}
          <div className="relative w-full sm:w-[230px] shrink-0">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  activeIndex={activeIndex ?? undefined}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={98}
                  dataKey="value"
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  stroke="none"
                  paddingAngle={chartData.length > 1 ? 2 : 0}
                  animationBegin={0}
                  animationDuration={500}
                >
                  {chartData.map((e, i) => (
                    <Cell
                      key={i}
                      fill={e.color}
                      style={{ filter: activeIndex === i ? `drop-shadow(0 0 8px ${e.color}90)` : "none", transition: "filter 0.2s" }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center overlay — shows when nothing is hovered */}
            {activeIndex === null && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Total</p>
                <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(totalValue)}</p>
                <p className="text-[10px] text-muted-foreground">{chartData.length} {view === "position" ? "posiciones" : "grupos"}</p>
              </div>
            )}
          </div>

          {/* ── Legend list ── */}
          <div className="flex-1 min-w-0 w-full space-y-1.5 max-h-[230px] overflow-y-auto pr-1">
            {chartData.map((e, i) => (
              <div
                key={e.key}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all cursor-default select-none",
                  activeIndex === i
                    ? "bg-muted/80 shadow-sm"
                    : "hover:bg-muted/40"
                )}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {/* Color dot with glow */}
                <span
                  className="h-3 w-3 rounded-full shrink-0 transition-transform"
                  style={{
                    background: e.color,
                    boxShadow: activeIndex === i ? `0 0 8px ${e.color}80` : "none",
                    transform: activeIndex === i ? "scale(1.3)" : "scale(1)",
                  }}
                />

                {/* Label + bars */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{e.label}</span>
                    <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: e.color }}>
                      {e.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${e.pct}%`, background: `linear-gradient(90deg, ${e.color}cc, ${e.color})` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 min-w-[58px] text-right">
                      {formatCurrency(e.value)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Position dialogs ──────────────────────────────────────────────────── */

function AddPositionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ticker: "", name: "", shares: "", averageCost: "", currentPrice: "", assetClass: "etf", currency: "EUR", country: "" });
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string; broker: string }[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleOpen() {
    const res = await fetch("/api/investments/accounts");
    if (res.ok) { const d = await res.json(); setAccounts(d.data ?? []); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    let accId = accountId;
    if (!accId) {
      const r = await fetch("/api/investments/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Mi Broker", broker: "Otro", currency: "EUR" }) });
      const d = await r.json();
      accId = d.data.id;
    }
    await fetch("/api/investments/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        shares: parseFloat(form.shares),
        averageCost: parseFloat(form.averageCost),
        currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : null,
        accountId: accId,
      }),
    });
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSaving(false);
    onClose();
  }

  const currSymbol = form.currency === "USD" ? "$" : "€";

  return (
    <Dialog open={open} onOpenChange={o => { if (o) handleOpen(); else onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Añadir Posición</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ticker</label>
              <Input placeholder="VWCE" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Clase de activo</label>
              <Select value={form.assetClass} onValueChange={v => setForm(f => ({ ...f, assetClass: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="stocks">Acciones</SelectItem>
                  <SelectItem value="bonds">Bonos</SelectItem>
                  <SelectItem value="crypto">Cripto</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre</label>
            <Input placeholder="Vanguard FTSE All-World" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          {/* Currency selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Divisa de cotización</label>
            <div className="flex gap-2">
              {["EUR", "USD"].map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, currency: cur }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors",
                    form.currency === cur
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cur === "EUR" ? "€ Euro" : "$ Dólar"}
                </button>
              ))}
            </div>
            {form.currency === "USD" && (
              <p className="text-[11px] text-amber-400/80">Los precios en USD se convierten a € automáticamente usando el tipo de cambio real.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Acciones</label>
              <Input type="number" step="0.0001" placeholder="10" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coste medio {currSymbol}</label>
              <Input type="number" step="0.01" placeholder="100.00" value={form.averageCost} onChange={e => setForm(f => ({ ...f, averageCost: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Precio actual {currSymbol}</label>
              <Input type="number" step="0.01" placeholder="110.00" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">País / Región <span className="text-muted-foreground font-normal">(opcional, para el gráfico)</span></label>
            <Input placeholder="USA, Europa, Global, España..." value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Añadir posición"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPositionDialog({ position, onClose }: {
  position: {
    id: string; ticker: string; name: string; shares: number;
    averageCost: number; currentPrice: number | null;
    averageCostNative: number; currentPriceNative: number | null;
    currency: string; assetClass: string | null; country: string | null;
  };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: position.name,
    shares: String(position.shares),
    averageCost: String(position.averageCostNative ?? position.averageCost),
    currentPrice: (position.currentPriceNative ?? position.currentPrice) != null
      ? String(position.currentPriceNative ?? position.currentPrice)
      : "",
    assetClass: position.assetClass ?? "stocks",
    currency: position.currency ?? "EUR",
    country: position.country ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/investments/positions/${position.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        shares: parseFloat(form.shares),
        averageCost: parseFloat(form.averageCost),
        currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : null,
        assetClass: form.assetClass,
        currency: form.currency,
        country: form.country,
      }),
    });
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSaving(false);
    onClose();
  }

  const currSymbol = form.currency === "USD" ? "$" : "€";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar posición — <span className="font-mono text-primary">{position.ticker}</span></DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Clase de activo</label>
              <Select value={form.assetClass} onValueChange={v => setForm(f => ({ ...f, assetClass: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocks">Acciones</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="bonds">Bonos</SelectItem>
                  <SelectItem value="crypto">Cripto</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Currency selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Divisa de cotización</label>
            <div className="flex gap-2">
              {["EUR", "USD"].map(cur => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, currency: cur }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors",
                    form.currency === cur
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cur === "EUR" ? "€ Euro" : "$ Dólar"}
                </button>
              ))}
            </div>
            {form.currency === "USD" && (
              <p className="text-[11px] text-amber-400/80">Los precios en USD se convierten a € automáticamente usando el tipo de cambio real.</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Acciones</label>
              <Input type="number" step="0.0001" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coste medio {currSymbol}</label>
              <Input type="number" step="0.01" value={form.averageCost} onChange={e => setForm(f => ({ ...f, averageCost: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Precio actual {currSymbol}</label>
              <Input type="number" step="0.01" placeholder="—" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">País / Región <span className="text-muted-foreground font-normal">(opcional, para el gráfico)</span></label>
            <Input placeholder="USA, Europa, Global, España..." value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Broker columns we recognize (case-insensitive) ---
const COL_TICKER  = /instrumento|ticker|symbol/i;
const COL_SHARES  = /posici[oó]n|shares|cantidad|acciones/i;
const COL_PRICE   = /[uú]ltimo|last|precio\s*(actual|últ)/i;
const COL_AVG     = /precio\s*medio|coste\s*medio|avg|average/i;

function parseClipboard(text: string): Array<{ ticker: string; shares: number; averageCost: number; currentPrice: number | null }> {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Find header row (has a column matching COL_TICKER)
  let headerIdx = lines.findIndex(l => l.split(/\t/).some(c => COL_TICKER.test(c.trim())));
  if (headerIdx === -1) headerIdx = 0;

  const headers = lines[headerIdx].split(/\t/).map(h => h.trim());
  const idxTicker = headers.findIndex(h => COL_TICKER.test(h));
  const idxShares = headers.findIndex(h => COL_SHARES.test(h));
  const idxPrice  = headers.findIndex(h => COL_PRICE.test(h));
  const idxAvg    = headers.findIndex(h => COL_AVG.test(h));

  if (idxTicker === -1 || idxShares === -1) return [];

  return lines.slice(headerIdx + 1)
    .map(l => l.split(/\t/))
    .filter(cols => cols[idxTicker]?.trim())
    .map(cols => {
      const rawPrice = cols[idxPrice]?.replace(/^[A-Za-z]/, "").trim() ?? "";
      return {
        ticker:       cols[idxTicker].trim().toUpperCase(),
        shares:       parseSpanishNumber(cols[idxShares]?.trim() ?? ""),
        averageCost:  idxAvg !== -1 ? parseSpanishNumber(cols[idxAvg]?.trim() ?? "") : 0,
        currentPrice: rawPrice ? parseSpanishNumber(rawPrice) : null,
      };
    })
    .filter(p => p.ticker && p.shares > 0 && p.averageCost > 0);
}

function BulkImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseClipboard>>([]);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string; broker: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [parsed, setParsed] = useState(false);

  async function handleOpen() {
    const res = await fetch("/api/investments/accounts");
    if (res.ok) { const d = await res.json(); setAccounts(d.data ?? []); }
  }

  function handleParse() {
    const rows = parseClipboard(text);
    setPreview(rows);
    setParsed(true);
  }

  async function handleImport() {
    setSaving(true);
    let accId = accountId;
    if (!accId) {
      const r = await fetch("/api/investments/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Mi Broker", broker: "Otro", currency: "EUR" }) });
      const d = await r.json();
      accId = d.data.id;
    }
    const positions = preview.map(p => ({ ...p, name: p.ticker, assetClass: "stocks" }));
    await fetch("/api/investments/positions/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ positions, accountId: accId }) });
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSaving(false);
    setText(""); setPreview([]); setParsed(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (o) handleOpen(); else { setText(""); setPreview([]); setParsed(false); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar posiciones desde broker</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            En tu broker, selecciona toda la tabla de posiciones → Ctrl+C → pega aquí
          </p>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-3">
            <textarea
              className="w-full h-40 text-xs font-mono bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={"INSTRUMENTO\tPOSICIÓN\tÚLTIMO\t...\tPRECIO MEDIO\n" +
                           "AMZN\t20\t241,60\t...\t148,02\n" +
                           "GOOGL\t20\t324,56\t...\t131,70"}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={!text.trim()}>Analizar tabla</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {preview.length === 0 ? (
              <p className="text-sm text-red-400 py-4 text-center">No se detectaron columnas reconocibles. Asegúrate de pegar la tabla con sus cabeceras (INSTRUMENTO, POSICIÓN, PRECIO MEDIO).</p>
            ) : (
              <div className="overflow-auto max-h-64 rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ticker</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Acciones</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Coste medio</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Precio actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-mono font-bold">{p.ticker}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.shares}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(p.averageCost)}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.currentPrice != null ? formatCurrency(p.currentPrice) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {accounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cuenta de inversión</label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Crear nueva cuenta automáticamente" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.broker})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setParsed(false)}>Atrás</Button>
              <Button onClick={handleImport} disabled={saving || preview.length === 0}>
                {saving ? "Importando..." : `Importar ${preview.length} posiciones`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
