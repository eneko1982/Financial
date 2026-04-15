"use client";
import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Pencil, Trash2, Download, PenLine } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserCategories } from "@/hooks/useUserCategories";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import { CategoryEditor } from "@/components/transactions/CategoryEditor";
import { Skeleton } from "@/components/ui/skeleton";

const BANK_COLORS: Record<string, string> = {
  BBVA: "#00A1E0", Santander: "#EC0000", CaixaBank: "#F5A623", ING: "#FF6200",
  Sabadell: "#007DC5", Bankinter: "#FF6B35", Otro: "#6366f1",
};

export default function AccountsPage() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: userCategories = [] } = useUserCategories();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [deleteTxPending, setDeleteTxPending] = useState(false);
  const qc = useQueryClient();
  const [editAccount, setEditAccount] = useState<{ id: string; name: string; bank: string; type: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const { setEditTx } = useUIStore();

  const { data: txData, isLoading: txLoading } = useTransactions({
    accountId: selectedAccount || undefined,
    search: search || undefined,
    category: category || undefined,
    subcategory: subcategory || undefined,
    page,
    limit: 30,
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Subcategory options: children of selected category (if any), else all children across categories
  const selectedCategoryObj = userCategories.find((c) => c.name === category);
  const subcategoryOptions = selectedCategoryObj
    ? selectedCategoryObj.children
    : userCategories.flatMap((c) => c.children);

  const pageRows = txData?.data ?? [];
  const totalResults = txData?.meta?.total ?? 0;

  async function deleteTransaction() {
    if (!deleteTxId) return;
    setDeleteTxPending(true);
    try {
      await fetch(`/api/transactions/${deleteTxId}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } finally {
      setDeleteTxPending(false);
      setDeleteTxId(null);
    }
  }

  return (
    <div>
      <Header title="Cuentas Bancarias" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Account list (mobile) / card grid (desktop) */}
        {/* Mobile: stacked full-width list items */}
        <div className="flex flex-col gap-2 lg:hidden">
          {accountsLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            : accounts.map((acc) => {
                const TYPE_LABELS: Record<string, string> = { checking: "Corriente", savings: "Ahorro", credit: "Crédito", epsv: "EPSV", investment: "Inversión" };
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccount(selectedAccount === acc.id ? "" : acc.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all active:scale-[0.98]",
                      selectedAccount === acc.id ? "border-primary/70 bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    {/* Color dot */}
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: BANK_COLORS[acc.bank] ?? "#6366f1" }} />
                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.bank} · {TYPE_LABELS[acc.type] ?? acc.type}</p>
                    </div>
                    {/* Balance */}
                    <p className={cn("text-base font-bold tabular-nums shrink-0", acc.balance >= 0 ? "text-foreground" : "text-red-400")}>
                      {formatCurrency(acc.balance)}
                    </p>
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <button className="rounded p-1 hover:bg-muted transition-colors">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditAccount({ id: acc.id, name: acc.name, bank: acc.bank, type: acc.type })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setDeleteId(acc.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
          >
            <Plus className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Añadir cuenta</span>
          </button>
        </div>

        {/* Desktop: card grid */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {accountsLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
            : accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => setSelectedAccount(selectedAccount === acc.id ? "" : acc.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all hover:border-primary/50 cursor-pointer",
                  selectedAccount === acc.id ? "border-primary/70 bg-primary/5" : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: BANK_COLORS[acc.bank] ?? "#6366f1" }}>{acc.bank}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">{acc.type === "checking" ? "Corriente" : acc.type === "savings" ? "Ahorro" : acc.type}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <button className="rounded p-0.5 hover:bg-muted transition-colors ml-1">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditAccount({ id: acc.id, name: acc.name, bank: acc.bank, type: acc.type })}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => setDeleteId(acc.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground truncate">{acc.name}</p>
                <p className={cn("text-xl font-bold tabular-nums mt-1", acc.balance >= 0 ? "text-foreground" : "text-red-400")}>{formatCurrency(acc.balance)}</p>
              </div>
            ))}
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl border-2 border-dashed border-border p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Añadir cuenta</span>
          </button>
        </div>

        {/* Total */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Total en cuentas:</span>
          <span className="font-semibold text-foreground">{formatCurrency(totalBalance)}</span>
          {selectedAccount && <Badge variant="outline" className="ml-2">Filtrado por: {accounts.find(a => a.id === selectedAccount)?.name}</Badge>}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar transacciones..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={category || "all"} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setSubcategory(""); setPage(1); }}>
            <SelectTrigger className="w-48">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {userCategories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subcategoryOptions.length > 0 && (
            <Select value={subcategory || "all"} onValueChange={(v) => { setSubcategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Subcategoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las subcategorías</SelectItem>
                {subcategoryOptions.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const params = new URLSearchParams();
                if (selectedAccount) params.set("accountId", selectedAccount);
                if (category) params.set("category", category);
                if (subcategory) params.set("subcategory", subcategory);
                window.open(`/api/transactions/export?${params}`);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filter summary */}
        {!txLoading && (search || category || subcategory || selectedAccount) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{txData?.meta?.total ?? 0} resultados</span>
            <span className="text-border">·</span>
            <span>Suma:</span>
            <span className={cn(
              "font-semibold tabular-nums",
              (txData?.meta?.sum ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {(txData?.meta?.sum ?? 0) >= 0 ? "+" : ""}{formatCurrency(txData?.meta?.sum ?? 0)}
            </span>
          </div>
        )}

        {/* Transactions table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {txLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : pageRows.map((tx) => (
                        <tr
                          key={tx.id}
                          className="group border-t border-border hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("es-ES")}</td>
                          <td className="px-4 py-3 max-w-[280px]">
                            <p className="truncate font-medium">{tx.description}</p>
                            {tx.notes && <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{tx.notes}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <CategoryEditor
                              transactionId={tx.id}
                              currentCategory={tx.category ?? null}
                              currentSubcategory={tx.subcategory ?? null}
                              currentNotes={tx.notes ?? null}
                              editedByUser={tx.editedByUser}
                              description={tx.description}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{tx.account?.name}</td>
                          <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                            {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => setEditTx({
                                  id: tx.id,
                                  amount: tx.amount,
                                  description: tx.description,
                                  date: tx.date,
                                  accountId: tx.accountId,
                                  category: tx.category ?? null,
                                  subcategory: tx.subcategory ?? null,
                                  notes: tx.notes ?? null,
                                  isTransfer: tx.isTransfer ?? false,
                                })}
                                className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                title="Editar movimiento"
                              >
                                <PenLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTxId(tx.id)}
                                className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                                title="Eliminar movimiento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                {!txLoading && pageRows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No hay transacciones</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalResults > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{totalResults} transacciones</span>
                {txData?.meta?.sum !== undefined && (
                  <>
                    <span className="text-border">·</span>
                    <span>Total:</span>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      txData.meta.sum >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {txData.meta.sum >= 0 ? "+" : ""}{formatCurrency(txData.meta.sum)}
                    </span>
                  </>
                )}
              </div>
              {totalResults > 30 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page * 30 >= totalResults} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
      <AddAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editAccount && (
        <EditAccountDialog account={editAccount} onClose={() => setEditAccount(null)} />
      )}
      {/* Delete account dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar cuenta?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Se desactivará la cuenta y no aparecerá en el dashboard. Las transacciones importadas se conservan.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteAccount.isPending} onClick={async () => {
              if (deleteId) { await deleteAccount.mutateAsync(deleteId); setDeleteId(null); if (selectedAccount === deleteId) setSelectedAccount(""); }
            }}>
              {deleteAccount.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single transaction dialog */}
      <Dialog open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar movimiento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTxId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteTxPending} onClick={deleteTransaction}>
              {deleteTxPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function EditAccountDialog({ account, onClose }: { account: { id: string; name: string; bank: string; type: string }; onClose: () => void }) {
  const updateAccount = useUpdateAccount();
  const [form, setForm] = useState({ name: account.name, type: account.type, bank: account.bank });

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
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={updateAccount.isPending}>{updateAccount.isPending ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createAccount = useCreateAccount();
  const [form, setForm] = useState({ name: "", type: "checking", bank: "BBVA", currency: "EUR", initialBalance: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createAccount.mutateAsync({ ...form, initialBalance: form.initialBalance ? parseFloat(form.initialBalance) : undefined });
    onClose();
    setForm({ name: "", type: "checking", bank: "BBVA", currency: "EUR", initialBalance: "" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nueva Cuenta</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre de la cuenta</label>
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
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Saldo inicial (€)</label>
            <Input type="number" step="0.01" placeholder="0.00" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createAccount.isPending}>{createAccount.isPending ? "Guardando..." : "Crear cuenta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

