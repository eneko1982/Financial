"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, MoreVertical, Pencil, Trash2, Download, Tag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserCategories } from "@/hooks/useUserCategories";
import { useQueryClient } from "@tanstack/react-query";
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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSubcategory, setBulkSubcategory] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const qc = useQueryClient();
  const [editAccount, setEditAccount] = useState<{ id: string; name: string; bank: string; type: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

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

  // Bulk selection helpers
  const pageRows = txData?.data ?? [];
  const pageIds = pageRows.map((t) => t.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));
  const totalResults = txData?.meta?.total ?? 0;

  // Reset selection when filters or page changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAllFiltered(false);
  }, [selectedAccount, search, category, subcategory, page]);

  function toggleRow(id: string) {
    setSelectAllFiltered(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    setSelectAllFiltered(false);
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set(Array.from(prev).concat(pageIds)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllFiltered(false);
    setBulkCategory("");
    setBulkSubcategory("");
  }

  const bulkCatObj = userCategories.find((c) => c.name === bulkCategory);
  const bulkSubcategoryOptions = bulkCatObj?.children ?? [];

  async function deleteTransaction() {
    if (!deleteTxId) return;
    setDeleteTxPending(true);
    try {
      await fetch(`/api/transactions/${deleteTxId}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteTxId); return n; });
    } finally {
      setDeleteTxPending(false);
      setDeleteTxId(null);
    }
  }

  async function applyBulk() {
    if (!bulkCategory) return;
    setBulkApplying(true);
    try {
      const body = selectAllFiltered
        ? {
            filter: {
              accountId: selectedAccount || undefined,
              search: search || undefined,
              category: category || undefined,
              subcategory: subcategory || undefined,
            },
            category: bulkCategory,
            subcategory: bulkSubcategory || null,
          }
        : {
            ids: Array.from(selectedIds),
            category: bulkCategory,
            subcategory: bulkSubcategory || null,
          };

      await fetch("/api/transactions/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      clearSelection();
    } finally {
      setBulkApplying(false);
    }
  }

  return (
    <div>
      <Header title="Cuentas Bancarias" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Account cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {accountsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))
            : accounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => setSelectedAccount(selectedAccount === acc.id ? "" : acc.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all hover:border-primary/50 cursor-pointer relative",
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

        {/* "Select all filtered" notice */}
        {allPageSelected && !selectAllFiltered && totalResults > pageIds.length && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">
              Seleccionados <strong className="text-foreground">{selectedIds.size}</strong> de esta página.
            </span>
            <button
              onClick={() => setSelectAllFiltered(true)}
              className="text-primary font-medium hover:underline"
            >
              Seleccionar los {totalResults} resultados del filtro actual
            </button>
          </div>
        )}
        {selectAllFiltered && (
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm">
            <span>
              <strong className="text-foreground">{totalResults} transacciones</strong>{" "}
              <span className="text-muted-foreground">seleccionadas (todos los resultados del filtro).</span>
            </span>
            <button onClick={() => setSelectAllFiltered(false)} className="text-muted-foreground hover:text-foreground underline text-xs">
              Deshacer
            </button>
          </div>
        )}

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
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={toggleAllPage}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      title="Seleccionar página"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {txLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-t border-border">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : pageRows.map((tx) => {
                      const isSelected = selectedIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={cn(
                            "group border-t border-border hover:bg-muted/20 transition-colors",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(tx.id)}
                              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                            />
                          </td>
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
                            <button
                              onClick={() => setDeleteTxId(tx.id)}
                              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                              title="Eliminar movimiento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                  })}
                {!txLoading && pageRows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No hay transacciones</td></tr>
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

        {/* Bulk action bar — slides in when rows are selected */}
        {(selectedIds.size > 0 || selectAllFiltered) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card shadow-2xl px-5 py-3.5 text-sm">
            <span className="font-semibold text-foreground whitespace-nowrap">
              {selectAllFiltered ? totalResults : selectedIds.size} seleccionados
            </span>
            <div className="w-px h-5 bg-border" />
            <Select value={bulkCategory || "none"} onValueChange={(v) => { setBulkCategory(v === "none" ? "" : v); setBulkSubcategory(""); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <Tag className="h-3 w-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Categoría…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar categoría…</SelectItem>
                {userCategories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bulkSubcategoryOptions.length > 0 && (
              <Select value={bulkSubcategory || "none"} onValueChange={(v) => setBulkSubcategory(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Subcategoría…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin subcategoría</SelectItem>
                  {bulkSubcategoryOptions.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              disabled={!bulkCategory || bulkApplying}
              onClick={applyBulk}
              className="h-8 px-4"
            >
              {bulkApplying ? "Aplicando…" : "Aplicar"}
            </Button>
            <button
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs"
            >
              Cancelar
            </button>
          </div>
        )}

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

