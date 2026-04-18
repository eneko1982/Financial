"use client";
import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown,
  Plus, MoreVertical, Pencil, Trash2, ArrowLeftRight, Landmark,
  ChevronUp, ChevronDown, BarChart2, Eye, EyeOff,
} from "lucide-react";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useReorderAccounts } from "@/hooks/useAccounts";
import { useLiabilities } from "@/hooks/useLiabilities";
import { useSummary, useInvestmentPositions } from "@/hooks/useAnalytics";
import { useTransactions } from "@/hooks/useTransactions";
import { useUIStore, type EditTxData } from "@/store/uiStore";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const BANK_COLORS: Record<string, string> = {
  BBVA: "#00A1E0", Santander: "#EC0000", CaixaBank: "#F5A623", ING: "#FF6200",
  Sabadell: "#007DC5", Bankinter: "#FF6B35", Otro: "#6366f1",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "Corriente", savings: "Ahorro", credit: "Crédito",
  epsv: "EPSV", investment: "Inversión",
};

function monthLabel(ym: string) {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function addMonth(ym: string, delta: number) {
  const [year, month] = ym.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function InicioPage() {
  const { selectedMonth, setSelectedMonth, setEditTx, includePortfolioInNetWorth, setIncludePortfolioInNetWorth } = useUIStore();

  // Date range for selected month (timezone-safe: use getDate() not toISOString)
  const [ymYear, ymMonth] = selectedMonth.split("-").map(Number);
  const dateFrom = `${selectedMonth}-01`;
  const lastDay = new Date(ymYear, ymMonth, 0).getDate();
  const dateTo = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  // For past months use point-in-time balances (exclude future transactions)
  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = selectedMonth >= currentYM;
  const asOf = isCurrentMonth ? undefined : dateTo;

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: liabilityData = [] } = useLiabilities();
  const { data: summary } = useSummary(selectedMonth);
  const { data: posData } = useInvestmentPositions();

  const { data: txData } = useTransactions({ limit: 50, dateFrom, dateTo });

  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<{ id: string; name: string; bank: string; type: string; includeInNetWorth: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const reorderAccounts = useReorderAccounts();

  function moveAccount(index: number, direction: -1 | 1) {
    const ids = accounts.map(a => a.id);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    reorderAccounts.mutate(ids);
  }

  const bankAssets = accounts.filter(a => a.includeInNetWorth !== false).reduce((s, a) => s + a.balance, 0);
  const portfolioValue = posData?.totalValue ?? 0;
  const totalAssets = bankAssets + (includePortfolioInNetWorth ? portfolioValue : 0);
  const totalLiabilities = liabilityData.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const recentTxs = (txData?.data ?? []).slice(0, 8);

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Gradient header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 px-5 pt-12 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Inicio</h1>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-1 py-0.5">
            <button onClick={() => setSelectedMonth(addMonth(selectedMonth, -1))} className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors">
              <ChevronLeft className="h-4 w-4 text-white/70" />
            </button>
            <span className="text-xs font-medium text-white/90 capitalize min-w-[110px] text-center">{monthLabel(selectedMonth)}</span>
            <button onClick={() => setSelectedMonth(addMonth(selectedMonth, 1))} className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 transition-colors">
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/10 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-white/60" />
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Patrimonio</span>
            </div>
            <p className="text-base font-bold text-white leading-tight">{formatCurrency(netWorth)}</p>
          </div>
          <div className={cn("rounded-xl backdrop-blur p-3 space-y-1", totalLiabilities > 0 ? "bg-red-500/15" : "bg-white/5")}>
            <div className="flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-red-400/80" />
              <span className="text-[10px] text-red-300/80 font-medium uppercase tracking-wider">Pasivos</span>
            </div>
            <p className={cn("text-base font-bold leading-tight", totalLiabilities > 0 ? "text-red-300" : "text-white/50")}>
              {totalLiabilities > 0 ? `-${formatCurrency(totalLiabilities)}` : formatCurrency(0)}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-300/80 font-medium uppercase tracking-wider">Ingresos</span>
            </div>
            <p className="text-base font-bold text-emerald-300 leading-tight">{formatCurrency(summary?.monthlyIncome ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-orange-500/15 backdrop-blur p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-[10px] text-orange-300/80 font-medium uppercase tracking-wider">Gastos</span>
            </div>
            <p className="text-base font-bold text-orange-300 leading-tight">{formatCurrency(Math.abs(summary?.monthlyExpenses ?? 0))}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* ── Account list ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Mis cuentas</h2>
            <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              <Plus className="h-3.5 w-3.5" /> Añadir
            </button>
          </div>
          <div className="space-y-2">
            {accountsLoading
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
              : accounts.length === 0
                ? (
                  <button onClick={() => setCreateOpen(true)} className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-4 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all">
                    <Plus className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">Añadir primera cuenta</span>
                  </button>
                )
                : accounts.map((acc, i) => (
                  <div key={acc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    {/* Reorder arrows */}
                    <div className="flex flex-col shrink-0 -my-1">
                      <button
                        onClick={() => moveAccount(i, -1)}
                        disabled={i === 0}
                        className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Subir"
                      >
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => moveAccount(i, 1)}
                        disabled={i === accounts.length - 1}
                        className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Bajar"
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BANK_COLORS[acc.bank] ?? "#6366f1" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate">{acc.name}</p>
                        {!acc.includeInNetWorth && (
                          <span className="shrink-0 text-[9px] font-medium text-muted-foreground border border-border rounded-full px-1.5 py-px">excluida</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{acc.bank} · {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</p>
                    </div>
                    <p className={cn("text-base font-bold tabular-nums shrink-0", acc.balance >= 0 ? "text-foreground" : "text-red-400")}>
                      {formatCurrency(acc.balance)}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1 hover:bg-muted transition-colors shrink-0">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setEditAccount({ id: acc.id, name: acc.name, bank: acc.bank, type: acc.type, includeInNetWorth: acc.includeInNetWorth })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setDeleteId(acc.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}

            {/* Investments summary row — shown when there are positions */}
            {portfolioValue > 0 && (
              <div className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                includePortfolioInNetWorth
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-muted/20 opacity-60"
              )}>
                <div className="flex flex-col shrink-0 -my-1 w-[22px]" />
                <span className={cn("h-3 w-3 rounded-full shrink-0", includePortfolioInNetWorth ? "bg-emerald-500" : "bg-muted-foreground")} />
                <a href="/investments" className="flex-1 min-w-0 hover:underline">
                  <p className="text-sm font-semibold text-foreground">Cartera de inversiones</p>
                  <p className="text-xs text-muted-foreground">
                    {(posData?.data ?? []).length} posiciones · ver detalle →
                    {!includePortfolioInNetWorth && <span className="text-amber-400/80"> · excluida</span>}
                  </p>
                </a>
                <p className={cn("text-base font-bold tabular-nums shrink-0", includePortfolioInNetWorth ? "text-emerald-400" : "text-muted-foreground")}>
                  {formatCurrency(portfolioValue)}
                </p>
                <button
                  onClick={() => setIncludePortfolioInNetWorth(!includePortfolioInNetWorth)}
                  title={includePortfolioInNetWorth ? "Excluir del patrimonio" : "Incluir en el patrimonio"}
                  className="rounded p-1 hover:bg-muted transition-colors shrink-0"
                >
                  {includePortfolioInNetWorth
                    ? <Eye className="h-4 w-4 text-emerald-400/70" />
                    : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── Recent transactions ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Últimos movimientos</h2>
            <a href="/accounts" className="text-xs text-primary font-medium hover:underline">Ver todos</a>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {recentTxs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Sin movimientos recientes</div>
            ) : (
              recentTxs.map((tx, i) => (
                <div
                  key={tx.id}
                  className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer", i < recentTxs.length - 1 && "border-b border-border")}
                  onClick={() => setEditTx({ id: tx.id, amount: tx.amount, description: tx.description, date: tx.date, accountId: tx.accountId, category: tx.category ?? null, subcategory: tx.subcategory ?? null, notes: tx.notes ?? null, isTransfer: tx.isTransfer ?? false } as EditTxData)}
                >
                  {/* Icon */}
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tx.isTransfer ? "bg-blue-400/10" : tx.amount >= 0 ? "bg-emerald-400/10" : "bg-red-400/10")}>
                    {tx.isTransfer ? <ArrowLeftRight className="h-4 w-4 text-blue-400" /> : tx.amount >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
                  </div>
                  {/* Type + date */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", tx.isTransfer ? "text-blue-400" : tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                      {tx.isTransfer ? "Transferencia" : tx.amount >= 0 ? "Ingreso" : "Gasto"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(tx.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {/* Amount + category + account */}
                  <div className="text-right shrink-0 max-w-[130px]">
                    <p className={cn("text-sm font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </p>
                    {tx.category && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {tx.category}{tx.subcategory ? ` · ${tx.subcategory}` : ""}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 truncate">{tx.account.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Dialogs ── */}
      <AddAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editAccount && <EditAccountDialog account={editAccount} onClose={() => setEditAccount(null)} />}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar cuenta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Se desactivará y no aparecerá en el inicio. Las transacciones se conservan.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteAccount.isPending} onClick={async () => {
              if (deleteId) { await deleteAccount.mutateAsync(deleteId); setDeleteId(null); }
            }}>{deleteAccount.isPending ? "Eliminando..." : "Eliminar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Account dialogs ──────────────────────────────────────────────────── */

function AddAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAccount = useCreateAccount();
  const [form, setForm] = useState({ name: "", type: "checking", bank: "BBVA", currency: "EUR", initialBalance: "", includeInNetWorth: true });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createAccount.mutateAsync({ ...form, initialBalance: form.initialBalance ? parseFloat(form.initialBalance) : undefined });
    onClose();
    setForm({ name: "", type: "checking", bank: "BBVA", currency: "EUR", initialBalance: "", includeInNetWorth: true });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Cuenta</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre</label>
            <Input placeholder="Ej: BBVA Cuenta Corriente" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Banco</label>
              <Select value={form.bank} onValueChange={v => setForm(f => ({ ...f, bank: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["BBVA","Santander","CaixaBank","ING","Sabadell","Bankinter","Otro"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Corriente</SelectItem>
                  <SelectItem value="savings">Ahorro</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="epsv">EPSV</SelectItem>
                  <SelectItem value="investment">Inversión</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Saldo inicial (€)</label>
            <Input type="number" step="0.01" placeholder="0.00" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
            <input type="checkbox" checked={form.includeInNetWorth} onChange={e => setForm(f => ({ ...f, includeInNetWorth: e.target.checked }))} className="h-4 w-4 rounded accent-primary cursor-pointer" />
            <div>
              <p className="text-sm font-medium">Incluir en patrimonio neto</p>
              <p className="text-xs text-muted-foreground">El saldo sumará al cálculo de tu patrimonio</p>
            </div>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createAccount.isPending}>{createAccount.isPending ? "Guardando..." : "Crear cuenta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({ account, onClose }: { account: { id: string; name: string; bank: string; type: string; includeInNetWorth: boolean }; onClose: () => void }) {
  const updateAccount = useUpdateAccount();
  const [form, setForm] = useState({ name: account.name, type: account.type, bank: account.bank, includeInNetWorth: account.includeInNetWorth });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateAccount.mutateAsync({ id: account.id, ...form });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar cuenta</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Banco</label>
              <Select value={form.bank} onValueChange={v => setForm(f => ({ ...f, bank: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["BBVA","Santander","CaixaBank","ING","Sabadell","Bankinter","Otro"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Corriente</SelectItem>
                  <SelectItem value="savings">Ahorro</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                  <SelectItem value="epsv">EPSV</SelectItem>
                  <SelectItem value="investment">Inversión</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
            <input type="checkbox" checked={form.includeInNetWorth} onChange={e => setForm(f => ({ ...f, includeInNetWorth: e.target.checked }))} className="h-4 w-4 rounded accent-primary cursor-pointer" />
            <div>
              <p className="text-sm font-medium">Incluir en patrimonio neto</p>
              <p className="text-xs text-muted-foreground">El saldo sumará al cálculo de tu patrimonio</p>
            </div>
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateAccount.isPending}>{updateAccount.isPending ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
