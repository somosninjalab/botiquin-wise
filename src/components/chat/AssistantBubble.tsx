import { useEffect, useState } from "react";
import { useLocation, useSearch } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
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
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
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
            className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        </div>
      )}
      {open && <AssistantPanel onClose={() => setOpen(false)} entryContext={entryContext} />}
    </>
  );
}