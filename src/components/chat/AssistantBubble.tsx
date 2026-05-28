import { useEffect, useState } from "react";
import { useLocation, useSearch } from "@tanstack/react-router";
import { MessageCircle, Sparkles, Send } from "lucide-react";
import { AssistantPanel } from "./AssistantPanel";

export function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [nudged, setNudged] = useState(false);
  const location = useLocation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;

  // Hide on admin and auth routes
  const hidden =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/forgot-password") ||
    location.pathname.startsWith("/reset-password");

  const entryContext: Record<string, unknown> = {
    path: location.pathname,
    ...(search?.q ? { searchQuery: String(search.q) } : {}),
    ...(location.pathname.startsWith("/medicamento/")
      ? { medicationSlug: location.pathname.replace("/medicamento/", "") }
      : {}),
  };

  // One-time contextual nudge after 8s on /buscar or /medicamento/*
  useEffect(() => {
    if (hidden || open || nudged) return;
    const shouldNudge =
      location.pathname.startsWith("/buscar") || location.pathname.startsWith("/medicamento/");
    if (!shouldNudge) return;
    const t = setTimeout(() => setNudged(true), 8000);
    return () => clearTimeout(t);
  }, [location.pathname, hidden, open, nudged]);

  if (hidden) return null;

  return (
    <>
      {!open && (
        <>
          {/* Desktop: floating circle */}
          <div className="hidden md:flex fixed bottom-6 right-6 z-40 flex-col items-end gap-2">
            {nudged && (
              <button
                onClick={() => {
                  setOpen(true);
                  setNudged(false);
                }}
                className="max-w-[240px] rounded-2xl rounded-br-sm bg-card border border-border shadow-lg px-3 py-2 text-sm text-left animate-in fade-in slide-in-from-bottom-2"
              >
                ¿No encontraste lo que buscabas? Te ayudo 👋
              </button>
            )}
            <button
              onClick={() => {
                setOpen(true);
                setNudged(false);
              }}
              aria-label="Abrir asistente"
              className="h-14 w-14 rounded-full bg-gradient-to-br from-accent to-accent-glow text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile: chat-input bar replacing bottom nav */}
          <div
            className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {nudged && (
              <button
                onClick={() => {
                  setOpen(true);
                  setNudged(false);
                }}
                className="mx-3 mt-2 block rounded-2xl bg-card border border-border shadow-md px-3 py-2 text-sm text-left animate-in fade-in slide-in-from-bottom-2"
              >
                ¿No encontraste lo que buscabas? Te ayudo 👋
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setNudged(false);
              }}
              aria-label="Abrir asistente"
              className="w-full flex items-center gap-3 px-3 py-3"
            >
              <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-glow text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left rounded-full bg-muted/70 border border-border/60 px-4 py-2.5 text-sm text-muted-foreground truncate">
                Pregúntame sobre tu medicina…
              </span>
              <span className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Send className="h-4 w-4" />
              </span>
            </button>
          </div>
        </>
      )}
      {open && <AssistantPanel onClose={() => setOpen(false)} entryContext={entryContext} />}
    </>
  );
}