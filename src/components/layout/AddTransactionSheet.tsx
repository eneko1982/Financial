"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useUserCategories } from "@/hooks/useUserCategories";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronRight, ChevronLeft, Check } from "lucide-react";
import type { EditTxData } from "@/store/uiStore";

type TxType = "expense" | "income" | "transfer";
type Screen = "form" | "category";

interface Props {
  open: boolean;
  onClose: () => void;
  editTx?: EditTxData | null;
}

const TYPE_CONFIG = {
  expense:  { label: "Gasto",        icon: ArrowDownLeft,  color: "text-red-400",     bg: "bg-red-400/10 border-red-400/30" },
  income:   { label: "Ingreso",       icon: ArrowUpRight,   color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  transfer: { label: "Transferencia", icon: ArrowLeftRight, color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/30" },
};

export function AddTransactionSheet({ open, onClose, editTx }: Props) {
  const isEdit = !!editTx;

  const [screen, setScreen] = useState<Screen>("form");
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

  // Temp state for the category picker screen
  const [pickerCategory, setPickerCategory] = useState("");
  const [pickerSubcategory, setPickerSubcategory] = useState("");

  const { data: accounts = [] } = useAccounts();
  const { data: userCategories = [] } = useUserCategories();
  const qc = useQueryClient();

  // Sync form state when dialog opens or editTx changes
  useEffect(() => {
    if (!open) return;
    if (editTx) {
      const txType: TxType = editTx.isTransfer ? "transfer" : editTx.amount >= 0 ? "income" : "expense";
      setType(txType);
      setAmount(String(Math.abs(editTx.amount)));
      setDescription(editTx.description);
      setDate(new Date(editTx.date).toISOString().slice(0, 10));
      setAccountId(editTx.accountId);
      setCategory(editTx.category ?? "");
      setSubcategory(editTx.subcategory ?? "");
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setAccountId("");
      setToAccountId("");
      setCategory("");
      setSubcategory("");
    }
    setError("");
    setScreen("form");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const firstAccountId = accounts[0]?.id ?? "";
  const effectiveAccount = accountId || firstAccountId;

  const selectedCatObj = userCategories.find(c => c.name === category);
  const pickerCatObj = userCategories.find(c => c.name === pickerCategory);
  const pickerSubOptions = pickerCatObj?.children ?? [];

  // Sort categories: matching type first, "both" second, opposite type last
  const txCatType = type === "income" ? "income" : "expense";
  const sortedCategories = [...userCategories].sort((a, b) => {
    const rank = (t: string) => t === txCatType ? 0 : t === "both" ? 1 : 2;
    return rank(a.type ?? "both") - rank(b.type ?? "both");
  });
  // First category that is NOT the matching type (used to show separator)
  const separatorIdx = sortedCategories.findIndex(c => (c.type ?? "both") !== txCatType && (c.type ?? "both") !== "both");

  function openCategoryPicker() {
    setPickerCategory(category);
    setPickerSubcategory(subcategory);
    setScreen("category");
  }

  function confirmCategory() {
    setCategory(pickerCategory);
    setSubcategory(pickerSubcategory);
    setScreen("form");
  }

  function handleClose() {
    setScreen("form");
    onClose();
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
      if (isEdit && editTx) {
        const finalAmount = type === "expense" ? -Math.abs(num) : Math.abs(num);
        const res = await fetch(`/api/transactions/${editTx.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalAmount,
            description: description || (type === "expense" ? "Gasto" : "Ingreso"),
            date: new Date(date + "T12:00:00").toISOString(),
            accountId: effectiveAccount,
            category: category || null,
            subcategory: subcategory || null,
          }),
        });
        const json = await res.json();
        if (json.error) { setError(json.error); return; }
      } else if (type === "transfer") {
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
      handleClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md w-full p-0 gap-0 bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 rounded-t-2xl sm:rounded-2xl fixed sm:relative top-auto sm:top-auto">

        {screen === "form" ? (
          <>
            {/* Type selector tabs */}
            <div className="flex border-b border-border">
              {(isEdit
                ? (["expense", "income"] as TxType[])
                : (["expense", "income", "transfer"] as TxType[])
              ).map(t => {
                const cfg = TYPE_CONFIG[t];
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); if (!isEdit) { setCategory(""); setSubcategory(""); } }}
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
                  {isEdit ? "Editar movimiento" : `Nuevo ${TYPE_CONFIG[type].label.toLowerCase()}`}
                </DialogTitle>
              </DialogHeader>

              {/* Amount */}
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

              {/* Account */}
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

              {/* Transfer destination */}
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

              {/* Category button — opens category picker screen */}
              {type !== "transfer" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</label>
                  <button
                    type="button"
                    onClick={openCategoryPicker}
                    className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 h-10 text-sm hover:border-muted-foreground/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {category && selectedCatObj?.color && (
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: selectedCatObj.color }} />
                      )}
                      <span className={cn("truncate", category ? "text-foreground" : "text-muted-foreground")}>
                        {category
                          ? (subcategory ? `${category} · ${subcategory}` : category)
                          : "Seleccionar categoría…"}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
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
                className={cn("w-full h-12 text-base font-semibold border", TYPE_CONFIG[type].bg, TYPE_CONFIG[type].color)}
                variant="outline"
              >
                {saving
                  ? "Guardando..."
                  : isEdit
                    ? "Guardar cambios"
                    : `Guardar ${TYPE_CONFIG[type].label.toLowerCase()}`}
              </Button>
            </form>
          </>
        ) : (
          /* ── Category picker screen ─────────────────── */
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <button
                type="button"
                onClick={() => setScreen("form")}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-semibold">Seleccionar categoría</span>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              {/* Categories grid */}
              <div className="p-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setPickerCategory(""); setPickerSubcategory(""); }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                    pickerCategory === ""
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  <span className="text-base text-muted-foreground leading-none">—</span>
                  <span className="text-center leading-tight">Sin categoría</span>
                </button>

                {sortedCategories.map((cat, idx) => {
                  const isOpposite = (cat.type ?? "both") !== txCatType && (cat.type ?? "both") !== "both";
                  const showSep = separatorIdx > 0 && idx === separatorIdx;
                  return (
                    <>
                      {showSep && (
                        <div key="sep" className="col-span-3 flex items-center gap-2 py-1">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-[10px] text-muted-foreground/60 font-medium">Otros</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setPickerCategory(cat.name); setPickerSubcategory(""); }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                          pickerCategory === cat.name
                            ? "border-primary bg-primary/10 text-primary"
                            : isOpposite
                              ? "border-border bg-card/50 text-muted-foreground/60 hover:text-muted-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                        )}
                      >
                        <span
                          className="h-6 w-6 rounded-full flex items-center justify-center"
                          style={{ background: (cat.color ?? "#6366f1") + (isOpposite ? "22" : "33") }}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ background: cat.color ?? "#6366f1", opacity: isOpposite ? 0.5 : 1 }} />
                        </span>
                        <span className="text-center leading-tight line-clamp-2">{cat.name}</span>
                      </button>
                    </>
                  );
                })}
              </div>

              {/* Subcategory pills — shown when selected category has children */}
              {pickerSubOptions.length > 0 && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Subcategoría</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerSubcategory("")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        pickerSubcategory === ""
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Sin subcategoría
                    </button>
                    {pickerSubOptions.map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setPickerSubcategory(sub.name)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          pickerSubcategory === sub.name
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-4 border-t border-border flex gap-2">
              <Button variant="ghost" className="flex-1" type="button" onClick={() => setScreen("form")}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" type="button" onClick={confirmCategory}>
                <Check className="h-4 w-4" />
                Aplicar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
