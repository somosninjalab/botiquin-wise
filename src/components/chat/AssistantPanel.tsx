import { useEffect, useRef, useState } from "react";
import { Send, X, Sparkles } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAnonToken,
  getStoredConversationId,
  setStoredConversationId,
  getAnonMsgCount,
  incrementAnonMsgCount,
  ANON_LIMIT,
} from "@/lib/assistant/anonymous-storage";

type Msg = { role: "user" | "assistant"; content: string };

export function AssistantPanel({ onClose, entryContext }: { onClose: () => void; entryContext?: Record<string, unknown> }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: user
        ? "¡Hola! Soy el asistente de Alerta Medicina. ¿Qué medicina estás buscando hoy? 👋"
        : "¡Hola! Te ayudo a comparar precios de medicinas. Cuéntame qué necesitas. 👋",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    if (!user && getAnonMsgCount() >= ANON_LIMIT) {
      setNeedsAuth(true);
      return;
    }

    setInput("");
    setMessages((p) => [...p, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setSending(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const anonToken = user ? null : getAnonToken();

      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId: getStoredConversationId(),
          anonToken,
          message: text,
          entryContext,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429 && err.needsAuth) {
          setNeedsAuth(true);
          setMessages((p) => {
            const next = [...p];
            next[next.length - 1] = { role: "assistant", content: "Regístrate gratis para seguir conversando ✨" };
            return next;
          });
        } else {
          setMessages((p) => {
            const next = [...p];
            next[next.length - 1] = { role: "assistant", content: err.error || "No pude responder. Intenta de nuevo." };
            return next;
          });
        }
        if (!user) incrementAnonMsgCount();
        return;
      }

      if (!user) incrementAnonMsgCount();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let pendingSearchQuery: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) !== -1) {
          const evt = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          if (!evt.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(evt.slice(6));
            if (data.type === "meta" && data.conversationId) {
              setStoredConversationId(data.conversationId);
            } else if (data.type === "delta" && data.text) {
              acc += data.text;
              setMessages((p) => {
                const next = [...p];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            } else if (data.type === "tool" && data.name === "search_medications") {
              try {
                const parsed = JSON.parse(data.result || "{}");
                const first = Array.isArray(parsed.results) ? parsed.results[0] : null;
                if (first?.name) pendingSearchQuery = String(first.name);
              } catch {}
            } else if (data.type === "error") {
              acc = data.message || "Error";
              setMessages((p) => {
                const next = [...p];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            } else if (data.type === "done" && pendingSearchQuery) {
              const q = pendingSearchQuery;
              pendingSearchQuery = null;
              onClose();
              navigate({ to: "/", search: (prev: any) => ({ ...prev, q }) });
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((p) => {
        const next = [...p];
        next[next.length - 1] = { role: "assistant", content: "Hubo un problema de conexión." };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-0 md:p-4 pointer-events-none">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm md:hidden pointer-events-auto" onClick={onClose} />
      <div className="relative pointer-events-auto flex flex-col w-full md:w-[420px] h-[100dvh] md:h-[600px] md:max-h-[80vh] bg-card border border-border md:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Asistente</p>
              <p className="text-xs text-muted-foreground">No reemplaza consulta médica</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {m.content || (sending && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
        </div>

        {needsAuth && !user && (
          <div className="px-4 py-3 border-t bg-accent/10 text-sm flex items-center justify-between gap-2">
            <span>Regístrate gratis para seguir</span>
            <Link to="/auth" onClick={onClose}>
              <Button size="sm">Crear cuenta</Button>
            </Link>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={needsAuth && !user ? "Inicia sesión para continuar" : "Escribe tu pregunta…"}
            disabled={sending || (needsAuth && !user)}
            maxLength={1000}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim() || (needsAuth && !user)}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}