import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useSearch } from "@tanstack/react-router";
import { MessageCircle, Sparkles } from "lucide-react";

// Lazy: el bundle del panel (con tool-calls, markdown, etc.) solo carga cuando
// el usuario abre el asistente. Reduce JS en el primer paint en móvil.
const AssistantPanel = lazy(() =>
  import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
);

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

          {/* Mobile: bubble flotante sobre la bottom-nav (lado derecho) */}
          <div
            className="md:hidden fixed right-3 z-40 flex flex-col items-end gap-2"
            style={{ bottom: `calc(72px + env(safe-area-inset-bottom))` }}
          >
            {nudged && (
              <button
                onClick={() => {
                  setOpen(true);
                  setNudged(false);
                }}
                className="max-w-[220px] rounded-2xl rounded-br-sm bg-card border border-border shadow-lg px-3 py-2 text-xs text-left animate-in fade-in slide-in-from-bottom-2"
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
              className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent-glow text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
      {open && (
        <Suspense fallback={null}>
          <AssistantPanel onClose={() => setOpen(false)} entryContext={entryContext} />
        </Suspense>
      )}
    </>
  );
}