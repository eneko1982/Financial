"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Header } from "@/components/layout/Header";
import { useInvestmentPositions } from "@/hooks/useAnalytics";
import { useUIStore } from "@/store/uiStore";
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
import { Plus, TrendingUp, TrendingDown, ClipboardPaste } from "lucide-react";

const ASSET_COLORS: Record<string, string> = {
  stocks: "#22c55e", etf: "#3b82f6", bonds: "#f59e0b", crypto: "#a855f7", cash: "#06b6d4", other: "#6b7280",
};

export default function InvestmentsPage() {
  const { data: posData } = useInvestmentPositions();
  const positions = posData?.data ?? [];
  const totalValue = posData?.totalValue ?? 0;
  const totalCost = positions.reduce((s, p) => s + p.costBasis, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { setImportOpen } = useUIStore();

  // Allocation by asset class
  const allocationData = Object.entries(
    positions.reduce((acc, p) => {
      const cls = p.assetClass ?? "other";
      acc[cls] = (acc[cls] ?? 0) + p.currentValue;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <Header title="Cartera de Inversiones" onImport={() => setImportOpen(true)} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Total</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(totalValue)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Coste Total</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatCurrency(totalCost)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">P&L Total</p>
            <p className={cn("text-2xl font-bold mt-1 tabular-nums", totalPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
              {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
            </p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rentabilidad</p>
            <p className={cn("text-2xl font-bold mt-1 tabular-nums", totalPnlPct >= 0 ? "text-emerald-400" : "text-red-400")}>
              {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
            </p>
          </CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Asignación por Clase de Activo</CardTitle></CardHeader>
            <CardContent>
              {allocationData.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Sin posiciones</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                      {allocationData.map((e, i) => <Cell key={i} fill={ASSET_COLORS[e.name] ?? "#6b7280"} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v)]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Position weights */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Peso de Posiciones</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {positions.slice(0, 7).map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.ticker}</span>
                    <span className="text-muted-foreground tabular-nums">{p.weight.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${p.weight}%` }} />
                  </div>
                </div>
              ))}
              {positions.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin posiciones. Añade tu primera posición.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Positions table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Posiciones</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setBulkOpen(true)}><ClipboardPaste className="h-3.5 w-3.5" />Pegar desde broker</Button>
              <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" />Añadir posición</Button>
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ticker</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clase</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Coste medio</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor actual</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">P&L</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold">{p.ticker}</td>
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
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No hay posiciones. Añade tu primera inversión.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
      <AddPositionDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
}

function AddPositionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ticker: "", name: "", shares: "", averageCost: "", currentPrice: "", assetClass: "etf" });
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
    // Create investment account if none
    let accId = accountId;
    if (!accId) {
      const r = await fetch("/api/investments/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Mi Broker", broker: "Otro", currency: "EUR" }) });
      const d = await r.json();
      accId = d.data.id;
    }
    await fetch("/api/investments/positions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, shares: parseFloat(form.shares), averageCost: parseFloat(form.averageCost), currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : null, accountId: accId }) });
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSaving(false);
    onClose();
  }

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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Acciones</label>
              <Input type="number" step="0.0001" placeholder="10" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Coste medio €</label>
              <Input type="number" step="0.01" placeholder="100.00" value={form.averageCost} onChange={e => setForm(f => ({ ...f, averageCost: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Precio actual €</label>
              <Input type="number" step="0.01" placeholder="110.00" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
            </div>
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
