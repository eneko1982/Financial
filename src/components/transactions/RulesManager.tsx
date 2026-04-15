"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2, Zap, CheckCircle2 } from "lucide-react";
import {
  useTransactionRules,
  useCreateTransactionRule,
  useUpdateTransactionRule,
  useDeleteTransactionRule,
  useApplyTransactionRules,
} from "@/hooks/useTransactionRules";
import type { TransactionRule } from "@/hooks/useTransactionRules";
import { useUserCategories } from "@/hooks/useUserCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: "contiene",
  startsWith: "empieza por",
  endsWith: "termina en",
  regex: "regex",
};

interface RuleForm {
  name: string;
  pattern: string;
  matchType: string;
  category: string;
  subcategory: string;
  priority: string;
}

const EMPTY_FORM: RuleForm = {
  name: "", pattern: "", matchType: "contains", category: "", subcategory: "", priority: "0",
};

export function RulesManager() {
  const { data: rules = [] } = useTransactionRules();
  const { data: userCategories = [] } = useUserCategories();
  const createRule = useCreateTransactionRule();
  const updateRule = useUpdateTransactionRule();
  const deleteRule = useDeleteTransactionRule();
  const applyRules = useApplyTransactionRules();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<TransactionRule | null>(null);
  const [applyResult, setApplyResult] = useState<number | null>(null);

  const topCategories = userCategories.filter((c) => !c.parentId);

  async function handleApply() {
    const res = await applyRules.mutateAsync();
    if (res?.data?.count !== undefined) {
      setApplyResult(res.data.count);
      setTimeout(() => setApplyResult(null), 4000);
    }
  }

  function openCreate() {
    setEditRule(null);
    setDialogOpen(true);
  }

  function openEdit(rule: TransactionRule) {
    setEditRule(rule);
    setDialogOpen(true);
  }

  async function handleToggle(rule: TransactionRule) {
    await updateRule.mutateAsync({ id: rule.id, isActive: !rule.isActive });
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Reglas de categorización automática</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se aplican en cada importación y sobrescriben la categoría sugerida por el sistema
            </p>
          </div>
          <div className="flex gap-2">
            {applyResult !== null && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {applyResult} transacciones actualizadas
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleApply}
              disabled={applyRules.isPending || rules.filter(r => r.isActive).length === 0}
            >
              <Zap className="h-3.5 w-3.5" />
              {applyRules.isPending ? "Aplicando..." : "Aplicar reglas"}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Nueva regla
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Sin reglas definidas. Las reglas permiten categorizar automáticamente transacciones al importar.
            </p>
            <Button size="sm" variant="outline" onClick={openCreate}>Crear primera regla</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-3 rounded-lg border border-border p-3 transition-opacity ${rule.isActive ? "" : "opacity-50"}`}
              >
                {/* Priority */}
                <span className="text-xs text-muted-foreground w-6 text-center font-mono">{rule.priority}</span>

                {/* Name + pattern */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rule.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono bg-muted px-1 rounded">{rule.pattern}</span>
                    {" "}<span className="opacity-60">{MATCH_TYPE_LABELS[rule.matchType] ?? rule.matchType}</span>
                  </p>
                </div>

                {/* Category → subcategory */}
                <div className="text-sm">
                  <Badge variant="outline" className="text-[10px]">
                    {rule.category}{rule.subcategory ? ` / ${rule.subcategory}` : ""}
                  </Badge>
                </div>

                {/* Active toggle */}
                <button
                  onClick={() => handleToggle(rule)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    rule.isActive
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {rule.isActive ? "Activa" : "Pausada"}
                </button>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <RuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={editRule}
        topCategories={topCategories}
        allRules={rules}
      />
    </Card>
  );
}

function RuleDialog({
  open,
  onClose,
  initialData,
  topCategories,
  allRules,
}: {
  open: boolean;
  onClose: () => void;
  initialData: TransactionRule | null;
  topCategories: { id: string; name: string }[];
  allRules: TransactionRule[];
}) {
  const createRule = useCreateTransactionRule();
  const updateRule = useUpdateTransactionRule();
  const { data: userCategories = [] } = useUserCategories();
  const isEdit = !!initialData;

  const [form, setForm] = useState<RuleForm>(
    initialData
      ? {
          name: initialData.name,
          pattern: initialData.pattern,
          matchType: initialData.matchType,
          category: initialData.category,
          subcategory: initialData.subcategory ?? "",
          priority: String(initialData.priority),
        }
      : {
          ...EMPTY_FORM,
          priority: String(allRules.length > 0 ? Math.max(...allRules.map(r => r.priority)) + 1 : 0),
        }
  );

  function set(k: keyof RuleForm, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const subcats = userCategories.filter(c => c.parentId && userCategories.find(p => p.id === c.parentId && p.name === form.category));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      pattern: form.pattern,
      matchType: form.matchType,
      category: form.category,
      subcategory: form.subcategory || null,
      priority: parseInt(form.priority) || 0,
    };

    if (isEdit && initialData) {
      await updateRule.mutateAsync({ id: initialData.id, ...payload });
    } else {
      await createRule.mutateAsync(payload);
    }
    onClose();
    if (!isEdit) setForm(EMPTY_FORM);
  }

  const saving = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar regla" : "Nueva regla de categorización"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nombre de la regla</label>
            <Input
              placeholder="Supermercado Lidl"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Patrón</label>
              <Input
                placeholder="lidl"
                value={form.pattern}
                onChange={e => set("pattern", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tipo de coincidencia</label>
              <Select value={form.matchType} onValueChange={v => set("matchType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contiene</SelectItem>
                  <SelectItem value="startsWith">Empieza por</SelectItem>
                  <SelectItem value="endsWith">Termina en</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categoría</label>
              <Select value={form.category} onValueChange={v => { set("category", v); set("subcategory", ""); }}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {topCategories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subcategoría (opcional)</label>
              {subcats.length > 0 ? (
                <Select value={form.subcategory} onValueChange={v => set("subcategory", v)}>
                  <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguna</SelectItem>
                    {subcats.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Subcategoría"
                  value={form.subcategory}
                  onChange={e => set("subcategory", e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prioridad <span className="text-muted-foreground font-normal">(menor = se aplica antes)</span></label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={form.priority}
              onChange={e => set("priority", e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.category}>
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear regla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
