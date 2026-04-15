"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X, Tag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  useUserCategories,
  useCreateUserCategory,
  useUpdateUserCategory,
  useDeleteUserCategory,
  UserCategory,
} from "@/hooks/useUserCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { RulesManager } from "@/components/transactions/RulesManager";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f59e0b", "#6366f1",
];

interface EditState {
  id: string;
  name: string;
  color: string;
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useUserCategories();
  const createCategory = useCreateUserCategory();
  const updateCategory = useUpdateUserCategory();
  const deleteCategory = useDeleteUserCategory();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Top-level create form
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[5]);
  const [showNewCatForm, setShowNewCatForm] = useState(false);

  // Subcategory create form
  const [newSubName, setNewSubName] = useState("");
  const [showNewSubForm, setShowNewSubForm] = useState(false);

  // Inline editing
  const [editingCat, setEditingCat] = useState<EditState | null>(null);
  const [editingSub, setEditingSub] = useState<EditState | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    await createCategory.mutateAsync({ name, color: newCatColor });
    setNewCatName("");
    setShowNewCatForm(false);
  }

  async function handleCreateSubcategory() {
    if (!selectedCategoryId) return;
    const name = newSubName.trim();
    if (!name) return;
    await createCategory.mutateAsync({ name, parentId: selectedCategoryId });
    setNewSubName("");
    setShowNewSubForm(false);
  }

  async function handleSaveCategory() {
    if (!editingCat) return;
    await updateCategory.mutateAsync({
      id: editingCat.id,
      name: editingCat.name.trim(),
      color: editingCat.color,
    });
    setEditingCat(null);
  }

  async function handleSaveSubcategory() {
    if (!editingSub) return;
    await updateCategory.mutateAsync({
      id: editingSub.id,
      name: editingSub.name.trim(),
    });
    setEditingSub(null);
  }

  async function handleDeleteCategory(cat: UserCategory) {
    const childCount = cat.children?.length ?? 0;
    const msg =
      childCount > 0
        ? `¿Eliminar la categoría "${cat.name}" y sus ${childCount} subcategoría(s)?`
        : `¿Eliminar la categoría "${cat.name}"?`;
    if (!window.confirm(msg)) return;
    if (selectedCategoryId === cat.id) setSelectedCategoryId(null);
    await deleteCategory.mutateAsync(cat.id);
  }

  async function handleDeleteSubcategory(sub: UserCategory) {
    if (!window.confirm(`¿Eliminar la subcategoría "${sub.name}"?`)) return;
    await deleteCategory.mutateAsync(sub.id);
  }

  return (
    <div>
      <Header title="Gestión de Categorías" />
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <p className="text-sm text-muted-foreground">
          Crea y organiza tus categorías y subcategorías para etiquetar tus movimientos.
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Left panel: top-level categories ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorías
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {isLoading && (
                <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
              )}

              {categories.map((cat) => {
                const isEditing = editingCat?.id === cat.id;
                const isSelected = selectedCategoryId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2 transition-colors cursor-pointer",
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/40 border border-transparent"
                    )}
                    onClick={() => {
                      if (!isEditing) setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id);
                    }}
                  >
                    {isEditing ? (
                      <>
                        {/* Color picker */}
                        <div className="flex gap-1 flex-wrap w-32">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingCat((prev) => prev ? { ...prev, color: c } : prev); }}
                              className={cn(
                                "h-4 w-4 rounded-full border-2 transition-transform",
                                editingCat.color === c ? "border-white scale-110" : "border-transparent"
                              )}
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                        <Input
                          value={editingCat.name}
                          onChange={(e) => setEditingCat((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveCategory();
                            if (e.key === "Escape") setEditingCat(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSaveCategory(); }}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Guardar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingCat(null); }}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ background: cat.color ?? "#6366f1" }}
                        />
                        <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
                        {(cat.children?.length ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-[10px] ml-1">
                            {cat.children.length}
                          </Badge>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCat({ id: cat.id, name: cat.name, color: cat.color ?? PRESET_COLORS[5] });
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                            className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {categories.length === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay categorías aún. Crea una para empezar.
                </p>
              )}

              {/* New category form */}
              {showNewCatForm ? (
                <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={cn(
                          "h-5 w-5 rounded-full border-2 transition-transform",
                          newCatColor === c ? "border-white scale-110" : "border-transparent"
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <Input
                    placeholder="Nombre de la categoría"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateCategory();
                      if (e.key === "Escape") { setShowNewCatForm(false); setNewCatName(""); }
                    }}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={!newCatName.trim() || createCategory.isPending}
                      className="flex-1"
                    >
                      Crear
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowNewCatForm(false); setNewCatName(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewCatForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva categoría
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── Right panel: subcategories ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Subcategorías
                {selectedCategory && (
                  <span className="normal-case font-normal text-foreground ml-1">
                    — <span style={{ color: selectedCategory.color ?? undefined }}>{selectedCategory.name}</span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {!selectedCategory && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Selecciona una categoría para ver sus subcategorías
                </p>
              )}

              {selectedCategory && (selectedCategory.children ?? []).map((sub) => {
                const isEditing = editingSub?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    className="group flex items-center gap-2 rounded-lg px-3 py-2 border border-transparent hover:bg-muted/40 transition-colors"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editingSub.name}
                          onChange={(e) => setEditingSub((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveSubcategory();
                            if (e.key === "Escape") setEditingSub(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveSubcategory}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Guardar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSub(null)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full flex-shrink-0 bg-muted-foreground/40" />
                        <span className="flex-1 text-sm truncate">{sub.name}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingSub({ id: sub.id, name: sub.name, color: "" })}
                            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubcategory(sub)}
                            className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {selectedCategory && (selectedCategory.children ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin subcategorías. Crea una abajo.
                </p>
              )}

              {selectedCategory && (
                <>
                  {showNewSubForm ? (
                    <div className="mt-2 space-y-2 rounded-lg border border-border p-3">
                      <Input
                        placeholder="Nombre de la subcategoría"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateSubcategory();
                          if (e.key === "Escape") { setShowNewSubForm(false); setNewSubName(""); }
                        }}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateSubcategory}
                          disabled={!newSubName.trim() || createCategory.isPending}
                          className="flex-1"
                        >
                          Crear
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setShowNewSubForm(false); setNewSubName(""); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewSubForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nueva subcategoría
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-6 pb-6 max-w-7xl mx-auto">
        <RulesManager />
      </div>
    </div>
  );
}
