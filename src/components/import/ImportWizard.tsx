"use client";
import { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { useQueryClient } from "@tanstack/react-query";

type Step = "upload" | "preview" | "confirm" | "done";
type BankFormat = "bbva" | "santander" | "caixabank" | "ing" | "sabadell" | "revolut" | "generic";

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  suggestedCategory: string;
  importHash: string;
  isDuplicate?: boolean;
  category?: string;
}

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  accounts: { id: string; name: string; bank: string }[];
}

export function ImportWizard({ open, onClose, accounts }: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [format, setFormat] = useState<BankFormat>("bbva");
  const [accountId, setAccountId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  function reset() {
    setStep("upload"); setFile(null); setRows([]);
    setError(null); setLoading(false); setImportedCount(0);
  }

  function handleClose() { reset(); onClose(); }

  async function handleParse() {
    if (!file || !accountId) { setError("Selecciona un archivo y una cuenta"); return; }
    setLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bankFormat", format);
      formData.append("accountId", accountId);
      const res = await fetch("/api/import/bank", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al parsear");
      setRows(data.data.parsed.map((r: ParsedRow) => ({ ...r, category: r.suggestedCategory })));
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/import/bank/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: rows.filter((r) => !r.isDuplicate), accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al importar");
      setImportedCount(data.data.count);
      setStep("done");
      qc.invalidateQueries();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  const newRows = rows.filter((r) => !r.isDuplicate);
  const dupRows = rows.filter((r) => r.isDuplicate);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar extracto bancario</DialogTitle>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {(["upload", "preview", "confirm", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold", step === s ? "bg-primary text-primary-foreground" : "bg-muted")}>{i + 1}</span>
              <span className={step === s ? "text-foreground" : ""}>{s === "upload" ? "Archivo" : s === "preview" ? "Revisión" : s === "confirm" ? "Confirmar" : "Listo"}</span>
              {i < 3 && <ChevronRight className="h-3 w-3" />}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Banco</label>
                  <Select value={format} onValueChange={(v) => setFormat(v as BankFormat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bbva">BBVA</SelectItem>
                      <SelectItem value="santander">Santander</SelectItem>
                      <SelectItem value="caixabank">CaixaBank</SelectItem>
                      <SelectItem value="ing">ING</SelectItem>
                      <SelectItem value="sabadell">Sabadell</SelectItem>
                      <SelectItem value="revolut">Revolut</SelectItem>
                      <SelectItem value="generic">Genérico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cuenta destino</label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue placeholder="Selecciona cuenta..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.bank})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className={cn("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5", file ? "border-primary/50 bg-primary/5" : "border-border")}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              >
                <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">Arrastra tu CSV/Excel aquí</p>
                    <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="profit">{newRows.length} nuevas</Badge>
                {dupRows.length > 0 && <Badge variant="secondary">{dupRows.length} duplicadas</Badge>}
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Fecha</th>
                      <th className="text-left px-3 py-2">Descripción</th>
                      <th className="text-left px-3 py-2">Categoría</th>
                      <th className="text-right px-3 py-2">Importe</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={cn("border-t border-border", r.isDuplicate && "opacity-40")}>
                        <td className="px-3 py-1.5 font-mono">{new Date(r.date).toLocaleDateString("es-ES")}</td>
                        <td className="px-3 py-1.5 max-w-[180px] truncate">{r.description}</td>
                        <td className="px-3 py-1.5">
                          <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>
                        </td>
                        <td className={cn("px-3 py-1.5 text-right font-mono tabular-nums", r.amount >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.isDuplicate && <Badge variant="outline" className="text-[10px]">dup</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">...y {rows.length - 50} más</p>}
              </div>
              {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />{error}</p>}
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4 py-4 text-center">
              <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
              <p className="font-medium">¿Confirmar importación?</p>
              <p className="text-sm text-muted-foreground">Se importarán <strong>{newRows.length}</strong> transacciones. Las {dupRows.length} duplicadas serán omitidas.</p>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === "done" && (
            <div className="space-y-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium text-lg">¡Importación completada!</p>
              <p className="text-sm text-muted-foreground">{importedCount} transacciones importadas correctamente.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={loading || !file || !accountId}>{loading ? "Procesando..." : "Analizar archivo"}</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>Atrás</Button>
              <Button onClick={() => setStep("confirm")} disabled={newRows.length === 0}>Continuar ({newRows.length})</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="ghost" onClick={() => setStep("preview")}>Atrás</Button>
              <Button onClick={handleConfirm} disabled={loading}>{loading ? "Importando..." : "Confirmar importación"}</Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
