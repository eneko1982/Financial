"use client";
import { useState } from "react";
import { Landmark, Plus, Edit2, Trash2, CreditCard, Home, Banknote, HelpCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useLiabilities, useCreateLiability, useUpdateLiability, useDeleteLiability } from "@/hooks/useLiabilities";
import type { Liability } from "@/hooks/useLiabilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/currency";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_LABELS: Record<string, string> = {
  mortgage: "Hipoteca",
  loan: "Préstamo",
  credit_card: "Tarjeta de crédito",
  other: "Otro",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  mortgage: <Home className="h-4 w-4" />,
  loan: <Banknote className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  mortgage: "#ef4444",
  loan: "#f97316",
  credit_card: "#a855f7",
  other: "#6b7280",
};

interface LiabilityForm {
  name: string;
  type: string;
  balance: string;
  interestRate: string;
  monthlyPayment: string;
  lender: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const EMPTY_FORM: LiabilityForm = {
  name: "", type: "loan", balance: "", interestRate: "", monthlyPayment: "",
  lender: "", startDate: "", endDate: "", notes: "",
};

export default function LiabilitiesPage() {
  const { data: liabilities = [], isLoading } = useLiabilities();
  const createLiability = useCreateLiability();
  const deleteLiability = useDeleteLiability();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);

  const totalBalance = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalMonthly = liabilities.reduce((s, l) => s + (l.monthlyPayment ?? 0), 0);
  const ratesWithValues = liabilities.filter(l => l.interestRate != null && l.balance > 0);
  const weightedRate = ratesWithValues.length > 0
    ? ratesWithValues.reduce((s, l) => s + (l.interestRate! * l.balance), 0) / ratesWithValues.reduce((s, l) => s + l.balance, 0)
    : null;

  return (
    <div>
      <Header title="Pasivos y Deudas" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deuda total</p>
            <p className="text-2xl font-bold mt-1 tabular-nums text-red-400">{formatCurrency(totalBalance)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuota mensual total</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{totalMonthly > 0 ? formatCurrency(totalMonthly) : "—"}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo medio ponderado</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{weightedRate != null ? `${weightedRate.toFixed(2)}%` : "—"}</p>
          </CardContent></Card>
        </div>

        {/* Add button */}
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />Añadir deuda
          </Button>
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : liabilities.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-12 text-center space-y-3">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">Sin pasivos registrados</p>
            <p className="text-sm text-muted-foreground">Añade tus deudas para ver el patrimonio neto real</p>
            <Button onClick={() => setCreateOpen(true)} variant="outline">Añadir deuda</Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {liabilities.map((lib) => {
              const color = TYPE_COLORS[lib.type] ?? "#6b7280";
              return (
                <Card key={lib.id}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}20`, color }}>
                          {TYPE_ICONS[lib.type] ?? <HelpCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-semibold">{lib.name}</p>
                          <Badge variant="outline" className="text-[10px] mt-0.5" style={{ color, borderColor: `${color}60` }}>
                            {TYPE_LABELS[lib.type] ?? lib.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditLiability(lib)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteLiability.mutate(lib.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-2xl font-bold tabular-nums" style={{ color }}>{formatCurrency(lib.balance)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">saldo pendiente</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {lib.interestRate != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tipo de interés</p>
                          <p className="font-semibold">{lib.interestRate}%</p>
                        </div>
                      )}
                      {lib.monthlyPayment != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Cuota mensual</p>
                          <p className="font-semibold">{formatCurrency(lib.monthlyPayment)}</p>
                        </div>
                      )}
                      {lib.lender && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Entidad</p>
                          <p className="font-medium">{lib.lender}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <LiabilityDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editLiability && (
        <LiabilityDialog
          open={!!editLiability}
          onClose={() => setEditLiability(null)}
          initialData={editLiability}
        />
      )}
    </div>
  );
}

function LiabilityDialog({
  open,
  onClose,
  initialData,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: Liability;
}) {
  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const isEdit = !!initialData;

  const [form, setForm] = useState<LiabilityForm>(
    initialData
      ? {
          name: initialData.name,
          type: initialData.type,
          balance: String(initialData.balance),
          interestRate: initialData.interestRate != null ? String(initialData.interestRate) : "",
          monthlyPayment: initialData.monthlyPayment != null ? String(initialData.monthlyPayment) : "",
          lender: initialData.lender ?? "",
          startDate: initialData.startDate ? initialData.startDate.slice(0, 10) : "",
          endDate: initialData.endDate ? initialData.endDate.slice(0, 10) : "",
          notes: initialData.notes ?? "",
        }
      : EMPTY_FORM
  );

  function set(k: keyof LiabilityForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      balance: parseFloat(form.balance),
      interestRate: form.interestRate ? parseFloat(form.interestRate) : null,
      monthlyPayment: form.monthlyPayment ? parseFloat(form.monthlyPayment) : null,
      lender: form.lender || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      notes: form.notes || null,
    };

    if (isEdit && initialData) {
      await updateLiability.mutateAsync({ id: initialData.id, ...payload });
    } else {
      await createLiability.mutateAsync(payload);
    }
    onClose();
    if (!isEdit) setForm(EMPTY_FORM);
  }

  const saving = createLiability.isPending || updateLiability.isPending;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar deuda" : "Añadir deuda"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre</label>
            <Input placeholder="Hipoteca vivienda" value={form.name} onChange={e => set("name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mortgage">Hipoteca</SelectItem>
                  <SelectItem value="loan">Préstamo</SelectItem>
                  <SelectItem value="credit_card">Tarjeta de crédito</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Saldo pendiente (€)</label>
              <Input type="number" step="0.01" placeholder="150000" value={form.balance} onChange={e => set("balance", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de interés (%)</label>
              <Input type="number" step="0.01" placeholder="2.5" value={form.interestRate} onChange={e => set("interestRate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cuota mensual (€)</label>
              <Input type="number" step="0.01" placeholder="600" value={form.monthlyPayment} onChange={e => set("monthlyPayment", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Entidad prestamista</label>
            <Input placeholder="Banco Santander" value={form.lender} onChange={e => set("lender", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha inicio</label>
              <Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Fecha fin</label>
              <Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notas</label>
            <Input placeholder="Observaciones opcionales" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Añadir deuda"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
