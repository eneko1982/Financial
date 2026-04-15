"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PenLine, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore, type EditTxData } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CategoryEditor } from "@/components/transactions/CategoryEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const label = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MovimientosPage() {
  const { setEditTx } = useUIStore();
  const { data: accounts = [] } = useAccounts();
  const [accountId, setAccountId] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);
  const [deleteTxPending, setDeleteTxPending] = useState(false);
  const qc = useQueryClient();

  const { data: txData, isLoading } = useTransactions({
    accountId: accountId || undefined,
    page,
    limit: 60,
  });

  const rows = txData?.data ?? [];
  const total = txData?.meta?.total ?? 0;

  // Group by date key YYYY-MM-DD
  const grouped: { key: string; label: string; txs: typeof rows; sum: number }[] = [];
  const seen = new Map<string, number>();
  for (const tx of rows) {
    const key = new Date(tx.date).toISOString().slice(0, 10);
    if (!seen.has(key)) {
      seen.set(key, grouped.length);
      grouped.push({ key, label: dayLabel(key), txs: [], sum: 0 });
    }
    const idx = seen.get(key)!;
    grouped[idx].txs.push(tx);
    grouped[idx].sum += tx.amount;
  }

  async function handleDelete() {
    if (!deleteTxId) return;
    setDeleteTxPending(true);
    try {
      await fetch(`/api/transactions/${deleteTxId}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    } finally {
      setDeleteTxPending(false);
      setDeleteTxId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Header title="Movimientos" />

      {/* Filter bar */}
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-2.5">
        <Select value={accountId || "all"} onValueChange={v => { setAccountId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 w-full sm:w-56 text-sm">
            <SelectValue placeholder="Todas las cuentas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cuentas</SelectItem>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Sin movimientos
          </div>
        ) : (
          grouped.map(({ key, label, txs, sum }) => (
            <section key={key}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                <span className={cn("text-xs font-mono font-semibold tabular-nums", sum >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {sum >= 0 ? "+" : ""}{formatCurrency(sum)}
                </span>
              </div>

              {/* Transaction cards */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {txs.map((tx, i) => (
                  <div
                    key={tx.id}
                    className={cn("group flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors", i < txs.length - 1 && "border-b border-border")}
                  >
                    {/* Icon */}
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      tx.isTransfer ? "bg-blue-400/10" : tx.amount >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"
                    )}>
                      {tx.isTransfer
                        ? <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                        : tx.amount >= 0
                          ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          : <ArrowDownLeft className="h-4 w-4 text-red-400" />}
                    </div>

                    {/* Description + category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <CategoryEditor
                          transactionId={tx.id}
                          currentCategory={tx.category ?? null}
                          currentSubcategory={tx.subcategory ?? null}
                          currentNotes={tx.notes ?? null}
                          editedByUser={tx.editedByUser}
                          description={tx.description}
                          compact
                        />
                        {!accountId && tx.account?.name && (
                          <>
                            <span className="text-[10px] text-muted-foreground/50">·</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{tx.account.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <p className={cn("text-sm font-semibold tabular-nums shrink-0", tx.amount >= 0 ? "text-emerald-400" : "text-foreground")}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </p>

                    {/* Row actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => setEditTx({ id: tx.id, amount: tx.amount, description: tx.description, date: tx.date, accountId: tx.accountId, category: tx.category ?? null, subcategory: tx.subcategory ?? null, notes: tx.notes ?? null, isTransfer: tx.isTransfer ?? false } as EditTxData)}
                        className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        title="Editar"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTxId(tx.id)}
                        className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* Pagination */}
        {total > 60 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="flex items-center text-sm text-muted-foreground px-2">{page} / {Math.ceil(total / 60)}</span>
            <Button variant="outline" size="sm" disabled={page * 60 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar movimiento?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTxId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteTxPending} onClick={handleDelete}>
              {deleteTxPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
