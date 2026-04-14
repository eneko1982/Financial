"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Send, Loader2, Sparkles, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";

const PRESET_QUESTIONS = [
  "¿Cuánto puedo ahorrar este mes según mi ritmo actual?",
  "¿Está bien diversificada mi cartera de inversión?",
  "¿Cuándo podré alcanzar mi fondo de emergencia?",
  "¿En qué categorías estoy gastando más de lo presupuestado?",
  "Dame un resumen de mi situación financiera",
  "¿Qué debería priorizar: reducir gastos o invertir más?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function AdvisorContent() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{ content: string; period: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQ && messages.length === 0) {
      sendMessage(initialQ);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date() };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          conversationId: convId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...assistantMsg, content: `❌ Error: ${err.error ?? "No se pudo conectar con el asesor. ¿Has configurado tu ANTHROPIC_API_KEY?"}` };
          return updated;
        });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...assistantMsg, content: fullText };
                  return updated;
                });
              }
              if (parsed.error) {
                fullText = `❌ Error: ${parsed.error}`;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...assistantMsg, content: fullText };
                  return updated;
                });
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setReportLoading(true);
    const period = new Date().toISOString().slice(0, 7);
    const res = await fetch("/api/ai/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
    const data = await res.json();
    if (data.data) setReport({ content: data.data.content, period });
    setReportLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <Header title="Asesor Financiero IA" />
      <div className="flex flex-1 overflow-hidden">

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-3 py-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 mx-auto">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Tu Asesor Financiero Personal</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Analizo tus datos financieros en tiempo real y te doy consejos concretos y personalizados. Pregúntame lo que necesites.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left rounded-xl border border-border bg-card p-3 text-sm hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary mb-1" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 space-y-1",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                )}>
                  {msg.role === "assistant" && msg.content === "" ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Analizando tu situación financiera...</span>
                    </div>
                  ) : (
                    <div className={cn(msg.role === "assistant" && "text-foreground")}>
                      {msg.role === "assistant" ? renderMd(msg.content) : <p className="text-sm">{msg.content}</p>}
                    </div>
                  )}
                  <p className={cn("text-[10px]", msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {format(msg.timestamp, "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            {messages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {PRESET_QUESTIONS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs hover:bg-muted transition-colors"
                  >
                    {q.length > 40 ? q.slice(0, 40) + "..." : q}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre tus finanzas..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()} size="icon">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>

        {/* Report sidebar */}
        <aside className="hidden xl:flex w-80 border-l border-border flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">Informe Mensual</span>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={generateReport} disabled={reportLoading}>
              {reportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Generar
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {report ? (
              <div className="text-xs space-y-1 leading-relaxed text-muted-foreground">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">{report.period}</p>
                {renderMd(report.content)}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8 space-y-2">
                <Sparkles className="h-8 w-8 text-muted-foreground/50 mx-auto" />
                <p>Genera un informe mensual con análisis detallado de tu situación financiera</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );

}

export default function AdvisorPage() {
  return (
    <Suspense>
      <AdvisorContent />
    </Suspense>
  );
}

function renderMd(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ")) return <p key={i} className="font-bold text-sm mt-3 mb-1 text-foreground">{line.slice(3)}</p>;
    if (line.startsWith("### ")) return <p key={i} className="font-semibold text-xs mt-2 mb-0.5 text-foreground">{line.slice(4)}</p>;
    if (line.startsWith("- ") || line.startsWith("* ")) return <p key={i} className="flex gap-1.5 text-xs"><span className="text-primary">•</span>{line.slice(2)}</p>;
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <p key={i} className="text-xs leading-relaxed">{line}</p>;
  });
}
