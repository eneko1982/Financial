"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useUserCategories } from "@/hooks/useUserCategories";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

type TxType = "expense" | "income" | "transfer";

interface Props { open: boolean; onClose: () => void; }

export function AddTransactionSheet({ open, onClose }: Props) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: accounts = [] } = useAccounts();
  const { data: userCategories = [] } = useUserCategories();
  const qc = useQueryClient();

  // Auto-select first account
  const firstAccountId = accounts[0]?.id ?? "";
  const effectiveAccount = accountId || firstAccountId;

  const selectedCatObj = userCategories.find(c => c.name === category);
  const subcategoryOptions = selectedCatObj?.children ?? [];

  function reset() {
    setAmount(""); setDescription(""); setCategory("");
    setSubcategory(""); setError("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount.replace(",", "."));
    if (!num || isNaN(num)) { setError("Introduce un importe válido"); return; }
    if (!effectiveAccount) { setError("Selecciona una cuenta"); return; }
    if (type === "transfer" && !toAccountId) { setError("Selecciona cuenta destino"); return; }
    if (type === "transfer" && toAccountId === effectiveAccount) { setError("Las cuentas deben ser distintas"); return; }

    setSaving(true);
    try {
      if (type === "transfer") {
        const res = await fetch("/api/transactions/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromAccountId: effectiveAccount,
            toAccountId,
            amount: Math.abs(num),
            date,
            description: description || "Transferencia entre cuentas",
          }),
        });
        const json = await res.json();
        if (json.error) { setError(json.error); return; }
      } else {
        const finalAmount = type === "expense" ? -Math.abs(num) : Math.abs(num);
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: effectiveAccount,
            amount: finalAmount,
            description: description || (type === "expense" ? "Gasto" : "Ingreso"),
            date: new Date(date + "T12:00:00").toISOString(),
            category: category || (type === "expense" ? "Sin categoría" : "Ingreso"),
            subcategory: subcategory || null,
            isTransfer: false,
            editedByUser: true,
          }),
        });
        const json = await res.json();
        if (json.error) { setError(json.error); return; }
      }

      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const typeConfig = {
    expense:  { label: "Gasto",          icon: ArrowDownLeft,  color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30" },
    income:   { label: "Ingreso",         icon: ArrowUpRight,   color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
    transfer: { label: "Transferencia",   icon: ArrowLeftRight, color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/30" },
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md w-full p-0 gap-0 bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 rounded-t-2xl sm:rounded-2xl fixed sm:relative top-auto sm:top-auto">
        {/* Type tabs */}
        <div className="flex border-b border-border">
          {(["expense", "income", "transfer"] as TxType[]).map(t => {
            const cfg = typeConfig[t];
            const Icon = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => { setType(t); setCategory(""); setSubcategory(""); }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors border-b-2",
                  type === t ? `${cfg.color} border-current` : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-base">
              Nuevo {typeConfig[type].label.toLowerCase()}
            </DialogTitle>
          </DialogHeader>

          {/* Amount — big input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">€</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="pl-10 text-2xl font-bold h-14 text-center"
              required
              autoFocus
            />
          </div>

          {/* From account */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {type === "transfer" ? "Cuenta origen" : "Cuenta"}
            </label>
            <Select value={effectiveAccount} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name} — {a.bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To account (transfer only) */}
          {type === "transfer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuenta destino</label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== effectiveAccount).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — {a.bank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category (expense/income) */}
          {type !== "transfer" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</label>
                <Select value={category || "none"} onValueChange={v => { setCategory(v === "none" ? "" : v); setSubcategory(""); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {userCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {subcategoryOptions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subcategoría</label>
                  <Select value={subcategory || "none"} onValueChange={v => setSubcategory(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Subcategoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin subcategoría</SelectItem>
                      {subcategoryOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <Input
            placeholder="Descripción (opcional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="h-9"
          />

          {/* Date */}
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-9"
            required
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={saving}
            className={cn("w-full h-12 text-base font-semibold", typeConfig[type].bg, typeConfig[type].color, "border")}
            variant="outline"
          >
            {saving ? "Guardando..." : `Guardar ${typeConfig[type].label.toLowerCase()}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
