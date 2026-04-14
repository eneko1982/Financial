"use client";
import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

const BANK_COLORS: Record<string, string> = {
  BBVA: "#00A1E0", Santander: "#EC0000", CaixaBank: "#007AFF", ING: "#FF6200",
  Sabadell: "#007DC5", Bankinter: "#FF6B35", Otro: "#6366f1",
};

export default function AccountsPage() {
  const { data: accounts = [] } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<{ id: string; name: string; bank: string; type: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const { setImportOpen } = useUIStore();

  const { data: txData } = useTransactions({
    accountId: selectedAccount || undefined,
    search: search || undefined,
    category: category || undefined,
    page,
    limit: 30,
  });

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <Header title="Cuentas Bancarias" onImport={() => setImportOpen(true)} />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Account cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
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
          <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {["Alimentación","Restaurantes","Transporte","Salud","Entretenimiento","Ropa","Hogar","Suministros","Telecomunicaciones","Seguros","Educación","Viajes"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                </tr>
              </thead>
              <tbody>
                {(txData?.data ?? []).map((tx) => (
                  <tr key={tx.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-3 max-w-[280px]">
                      <p className="truncate font-medium">{tx.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {tx.category && <Badge variant="secondary" className="text-[10px]">{tx.category}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{tx.account?.name}</td>
                    <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
                {(txData?.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No hay transacciones</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {(txData?.meta?.total ?? 0) > 30 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
              <span>{txData?.meta?.total} transacciones</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page * 30 >= (txData?.meta?.total ?? 0)} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </div>

      </div>
      <AddAccountDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editAccount && (
        <EditAccountDialog account={editAccount} onClose={() => setEditAccount(null)} />
      )}
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
