"use client";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserCategories } from "@/hooks/useUserCategories";
import { cn } from "@/lib/utils/cn";
import { getCategoryColor } from "@/lib/category-classifier";

interface Props {
  transactionId: string;
  currentCategory: string | null;
  currentSubcategory: string | null;
  currentNotes: string | null;
  editedByUser: boolean;
  /** Description of the transaction, used for "apply to similar" */
  description?: string;
  /** Extra query keys to invalidate after save (besides ["transactions"]) */
  extraInvalidate?: string[][];
  /** Compact display mode — smaller trigger, no subcategory badge */
  compact?: boolean;
}

export function CategoryEditor({
  transactionId,
  currentCategory,
  currentSubcategory,
  currentNotes,
  editedByUser,
  description,
  extraInvalidate = [],
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(currentCategory ?? "");
  const [categoryInput, setCategoryInput] = useState("");
  const [subcategory, setSubcategory] = useState(currentSubcategory ?? "");
  const [subcategoryInput, setSubcategoryInput] = useState("");
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [applyToSimilar, setApplyToSimilar] = useState(false);
  const [applyCount, setApplyCount] = useState<number | null>(null);
  const qc = useQueryClient();

  // Clear applyCount feedback after 3s
  useEffect(() => {
    if (applyCount === null) return;
    const t = setTimeout(() => setApplyCount(null), 3000);
    return () => clearTimeout(t);
  }, [applyCount]);

  const { data: userCategories = [] } = useUserCategories();

  // Reset state when dialog opens
  function handleOpen() {
    setCategory(currentCategory ?? "");
    setCategoryInput("");
    setSubcategory(currentSubcategory ?? "");
    setSubcategoryInput("");
    setNotes(currentNotes ?? "");
    setApplyToSimilar(false);
    setApplyCount(null);
    setOpen(true);
  }

  // Find the selected top-level category object to get its children
  const selectedCategoryObj = userCategories.find(
    (c) => c.name === category
  );
  const subcategoryOptions = selectedCategoryObj?.children ?? [];

  // Filtered category chips based on free-text input
  const filteredCategories = categoryInput
    ? userCategories.filter((c) =>
        c.name.toLowerCase().includes(categoryInput.toLowerCase())
      )
    : userCategories;

  // Filtered subcategory chips
  const filteredSubcategories = subcategoryInput
    ? subcategoryOptions.filter((s) =>
        s.name.toLowerCase().includes(subcategoryInput.toLowerCase())
      )
    : subcategoryOptions;

  async function handleSave() {
    setSaving(true);
    try {
      const finalCategory = categoryInput.trim() || category || null;
      const finalSubcategory = subcategoryInput.trim() || subcategory || null;
      const finalNotes = notes.trim() || null;

      await fetch(`/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: finalCategory,
          subcategory: finalSubcategory,
          notes: finalNotes,
        }),
      });

      // Optionally apply category to all transactions with similar description
      if (applyToSimilar && finalCategory && description) {
        // Use first 4+ significant words of description as the pattern
        const pattern = description.trim().split(/\s+/).slice(0, 5).join(" ");
        const res = await fetch("/api/transactions/bulk-categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descriptionPattern: pattern, category: finalCategory, subcategory: finalSubcategory }),
        });
        const json = await res.json();
        setApplyCount(json.data?.count ?? 0);
      }

      qc.invalidateQueries({ queryKey: ["transactions"] });
      for (const keys of extraInvalidate) {
        qc.invalidateQueries({ queryKey: keys });
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className="group flex flex-col items-start gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-muted/40 text-left min-w-[80px]"
        title="Editar etiquetas"
      >
        <div className="flex items-center gap-1">
          {currentCategory ? (() => {
            const catObj = userCategories.find(c => c.name === currentCategory);
            // Priority: user-defined color → system color map → no color
            const color = catObj?.color ?? getCategoryColor(currentCategory);
            const hasColor = color && color !== "#6b7280"; // #6b7280 is the "unknown" fallback
            return (
              <Badge
                variant="secondary"
                className="text-[10px] cursor-pointer"
                style={hasColor ? { backgroundColor: `${color}25`, color, borderColor: `${color}50` } : undefined}
              >
                {currentCategory}
              </Badge>
            );
          })() : (
            <span className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5 cursor-pointer">
              + categoría
            </span>
          )}
          {editedByUser && (
            <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" title="Editado manualmente" />
          )}
        </div>
        {currentSubcategory && (
          <Badge
            variant="outline"
            className="text-[9px] text-muted-foreground border-muted-foreground/30 cursor-pointer"
          >
            {currentSubcategory}
          </Badge>
        )}
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar etiquetas</DialogTitle>
            <DialogDescription>
              Asigna categoría y subcategoría a este movimiento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Category section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              {/* Chips */}
              {filteredCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {filteredCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategory(c.name);
                        setCategoryInput("");
                        // Reset subcategory when category changes
                        setSubcategory("");
                        setSubcategoryInput("");
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        category === c.name
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                      )}
                      style={
                        c.color && category !== c.name
                          ? { borderColor: c.color + "66", color: c.color }
                          : undefined
                      }
                    >
                      {c.color && (
                        <span
                          className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle"
                          style={{ background: c.color }}
                        />
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Free-text input */}
              <Input
                placeholder="Escribe categoría personalizada..."
                value={categoryInput}
                onChange={(e) => {
                  setCategoryInput(e.target.value);
                  if (e.target.value) {
                    setCategory("");
                    setSubcategory("");
                    setSubcategoryInput("");
                  }
                }}
                className="text-sm"
              />
              {category && !categoryInput && (
                <p className="text-xs text-primary">
                  Seleccionada:{" "}
                  <span className="font-medium">{category}</span>
                  <button
                    type="button"
                    className="ml-2 text-muted-foreground hover:text-foreground underline"
                    onClick={() => { setCategory(""); setSubcategory(""); }}
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>

            {/* Subcategory section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Subcategoría</label>
              {/* Chips — only show if parent category selected and has children */}
              {filteredSubcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {filteredSubcategories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSubcategory(s.name);
                        setSubcategoryInput("");
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        subcategory === s.name
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {filteredSubcategories.length === 0 && !category && (
                <p className="text-xs text-muted-foreground">Selecciona una categoría primero</p>
              )}
              <Input
                placeholder="Escribe subcategoría personalizada..."
                value={subcategoryInput}
                onChange={(e) => {
                  setSubcategoryInput(e.target.value);
                  if (e.target.value) setSubcategory("");
                }}
                className="text-sm"
              />
              {subcategory && !subcategoryInput && (
                <p className="text-xs text-primary">
                  Seleccionada:{" "}
                  <span className="font-medium">{subcategory}</span>
                  <button
                    type="button"
                    className="ml-2 text-muted-foreground hover:text-foreground underline"
                    onClick={() => setSubcategory("")}
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>

            {/* Notes section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notas{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade una nota a este movimiento..."
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-col">
            {description && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={applyToSimilar}
                  onChange={e => setApplyToSimilar(e.target.checked)}
                  className="h-3.5 w-3.5 accent-primary"
                />
                Aplicar también a movimientos similares
              </label>
            )}
            {applyCount !== null && (
              <p className="text-xs text-emerald-400 w-full">{applyCount} movimiento{applyCount !== 1 ? "s" : ""} actualizado{applyCount !== 1 ? "s" : ""}</p>
            )}
            <div className="flex gap-2 justify-end w-full">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={saving} onClick={handleSave}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
