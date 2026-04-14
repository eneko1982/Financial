"use client";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const SUGGESTED = [
  "Alimentación","Restaurantes","Transporte","Salud","Entretenimiento",
  "Ropa","Hogar","Suministros","Telecomunicaciones","Seguros",
  "Educación","Viajes","Nómina","Transferencia","Inversión","Otro",
];

interface Props {
  transactionId: string;
  currentCategory: string | null;
  /** Extra query keys to invalidate after save (besides ["transactions"]) */
  extraInvalidate?: string[][];
}

export function CategoryEditor({ transactionId, currentCategory, extraInvalidate = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(currentCategory ?? "");
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setInput(currentCategory ?? "");
    }
  }, [open, currentCategory]);

  async function save(cat: string) {
    setSaving(true);
    await fetch(`/api/transactions/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat || null }),
    });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    for (const keys of extraInvalidate) qc.invalidateQueries({ queryKey: keys });
    setSaving(false);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); save(input); }
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "rounded transition-colors",
          open && "ring-1 ring-primary/50"
        )}
        title="Editar categoría"
      >
        {currentCategory ? (
          <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-muted">
            {currentCategory}
          </Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground border border-dashed border-muted-foreground/30 rounded px-1.5 py-0.5 cursor-pointer">
            + categoría
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 rounded-lg border border-border bg-card shadow-lg p-3 space-y-3">
          {/* Text input */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe o elige categoría..."
            className="w-full text-xs bg-muted/50 border border-border rounded px-2.5 py-1.5 outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
          />

          {/* Suggested chips */}
          <div className="flex flex-wrap gap-1">
            {SUGGESTED.filter(s => !input || s.toLowerCase().includes(input.toLowerCase())).map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); save(s); }}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                  s === currentCategory
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 hover:bg-muted/50 text-muted-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            {currentCategory && (
              <button
                onClick={() => save("")}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
              >
                Quitar categoría
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setOpen(false)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => save(input)}
                disabled={saving}
                className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
