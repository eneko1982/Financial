"use client";
import { useState } from "react";

export default function ResetPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleReset() {
    if (!confirm("¿Seguro? Se borrarán TODOS los datos financieros. Esta acción es irreversible.")) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const json = await res.json();
      if (json.error) { setStatus("error"); setMessage(json.error); }
      else { setStatus("done"); setMessage("Todo borrado correctamente. Ya puedes cerrar esta página."); }
    } catch {
      setStatus("error");
      setMessage("Error al conectar con el servidor.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32, background: "#0f172a", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Resetear todos los datos</h1>
      <p style={{ color: "#94a3b8", maxWidth: 400, textAlign: "center" }}>
        Esto eliminará permanentemente todos los movimientos, saldos, cuentas de inversión, pasivos, presupuestos, objetivos, reglas y conversaciones con la IA.
      </p>

      {status === "idle" && (
        <button
          onClick={handleReset}
          style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 10, padding: "14px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
        >
          Borrar todo
        </button>
      )}

      {status === "loading" && (
        <p style={{ color: "#94a3b8" }}>Borrando datos…</p>
      )}

      {status === "done" && (
        <div style={{ background: "#14532d", color: "#86efac", borderRadius: 10, padding: "16px 28px", textAlign: "center" }}>
          ✓ {message}
        </div>
      )}

      {status === "error" && (
        <div style={{ background: "#450a0a", color: "#fca5a5", borderRadius: 10, padding: "16px 28px", textAlign: "center" }}>
          ✗ {message}
        </div>
      )}

      <a href="/dashboard" style={{ color: "#6366f1", fontSize: 14 }}>← Volver al inicio</a>
    </div>
  );
}
