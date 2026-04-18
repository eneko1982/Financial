"use client";
import React, { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Send, Loader2, Sparkles, RefreshCw, BarChart2, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [reportOpen, setReportOpen] = useState(false);
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

  async function generateReport(force = false) {
    setReportLoading(true);
    const period = new Date().toISOString().slice(0, 7);
    const res = await fetch("/api/ai/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, force }),
    });
    const data = await res.json();
    if (data.data) setReport({ content: data.data.content, period });
    setReportLoading(false);
  }

  function resetConversation() {
    setMessages([]);
    setConvId(undefined);
    setInput("");
  }

  const ReportContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Informe Mensual</span>
        <div className="flex gap-1.5">
          {report && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => generateReport(true)} disabled={reportLoading} title="Regenerar nuevo informe">
              <RefreshCw className="h-3 w-3" />
              Nuevo
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => generateReport(false)} disabled={reportLoading}>
            {reportLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {report ? "Ver" : "Generar"}
          </Button>
        </div>
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
    </>
  );

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
            <div className="flex gap-2 items-center">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2 flex-1">
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
              {messages.length > 0 && (
                <Button type="button" variant="ghost" size="icon" onClick={resetConversation} title="Nueva conversación">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              {/* Report button visible on non-XL screens */}
              <Button type="button" variant="ghost" size="icon" onClick={() => setReportOpen(true)} title="Informe mensual" className="xl:hidden">
                <BarChart2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Report sidebar — visible on XL+ screens */}
        <aside className="hidden xl:flex w-80 border-l border-border flex-col">
          <ReportContent />
        </aside>

        {/* Report dialog for smaller screens */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col xl:hidden">
            <DialogHeader>
              <DialogTitle>Informe Mensual</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <ReportContent />
            </div>
          </DialogContent>
        </Dialog>
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

// Parse inline markdown: **bold**, *italic*, `code`
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex: bold (**), italic (*), code (`)
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2] !== undefined) parts.push(<strong key={match.index} className="font-semibold text-foreground">{match[2]}</strong>);
    else if (match[3] !== undefined) parts.push(<em key={match.index} className="italic">{match[3]}</em>);
    else if (match[4] !== undefined) parts.push(<code key={match.index} className="bg-muted px-1 rounded text-[10px] font-mono">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMd(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table block: collect consecutive pipe lines
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split("|").filter(Boolean).map(s => s.trim());
        // skip separator row (---) if present
        const dataStart = tableLines[1].replace(/\s/g, "").replace(/[-|]/g, "") === "" ? 2 : 1;
        const rows = tableLines.slice(dataStart).map(r => r.split("|").filter(Boolean).map(s => s.trim()));
        result.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>{headers.map((h, j) => <th key={j} className="border border-border px-3 py-1.5 text-left font-semibold bg-muted/50">{parseInline(h)}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-border hover:bg-muted/20">
                    {row.map((cell, ci) => <td key={ci} className="border border-border px-3 py-1.5">{parseInline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      result.push(<div key={i} className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground text-xs my-1">{parseInline(line.slice(2))}</div>);
      i++; continue;
    }

    // H2
    if (line.startsWith("## ")) {
      result.push(<p key={i} className="font-bold text-sm mt-3 mb-1 text-foreground">{parseInline(line.slice(3))}</p>);
      i++; continue;
    }

    // H3
    if (line.startsWith("### ")) {
      result.push(<p key={i} className="font-semibold text-xs mt-2 mb-0.5 text-foreground">{parseInline(line.slice(4))}</p>);
      i++; continue;
    }

    // Bullet
    if (line.startsWith("- ") || line.startsWith("* ")) {
      result.push(<p key={i} className="flex gap-1.5 text-xs"><span className="text-primary shrink-0">•</span><span>{parseInline(line.slice(2))}</span></p>);
      i++; continue;
    }

    // Empty line
    if (line.trim() === "") {
      result.push(<div key={i} className="h-1" />);
      i++; continue;
    }

    // Regular paragraph
    result.push(<p key={i} className="text-xs leading-relaxed">{parseInline(line)}</p>);
    i++;
  }

  return result;
}
