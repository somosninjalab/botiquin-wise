import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Clock, X, ScanBarcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";

const RECENT_KEY = "am.recent_searches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  if (typeof window === "undefined" || !q.trim()) return;
  const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

export function SearchBar({
  initial = "",
  size = "md",
  onSearch,
  liveUpdate = false,
}: {
  initial?: string;
  size?: "md" | "lg";
  onSearch?: (q: string) => void;
  liveUpdate?: boolean;
}) {
  const [q, setQ] = useState(initial);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const wrapRef = useRef<HTMLFormElement | null>(null);
  const navigate = useNavigate();
  useEffect(() => { setQ(initial); }, [initial]);
  useEffect(() => { setRecent(readRecent()); }, []);
  // Cerrar el desplegable al tocar fuera (importante en móvil)
  useEffect(() => {
    if (!focused) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [focused]);

  const runSearch = (value: string) => {
    pushRecent(value);
    setRecent(readRecent());
    setFocused(false);
    if (onSearch) onSearch(value);
    else navigate({ to: "/", search: { q: value } });
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(q.trim());
  };
  const clearRecent = () => {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
    setRecent([]);
  };
  const showRecent = focused && recent.length > 0 && q.trim().length === 0;
  return (
    <form ref={wrapRef} onSubmit={onSubmit} role="search" className="relative flex w-full gap-2">
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${size === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
        <Input
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (liveUpdate && onSearch) onSearch(v);
          }}
          onFocus={() => setFocused(true)}
          placeholder="Busca tu medicina (ej. ibuprofeno)"
          className={`pl-10 bg-card ${size === "lg" ? "h-14 text-base" : "h-11 text-base"}`}
          maxLength={200}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Buscar medicamento"
        />
      </div>
      <Button
        type="submit"
        aria-label="Buscar"
        className={`bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shrink-0 ${
          size === "lg" ? "h-14 px-4 sm:px-6 text-base" : "h-11 px-4"
        }`}
      >
        <Search className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline">Buscar</span>
      </Button>
      {showRecent && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recientes</span>
            <button type="button" onClick={clearRecent} className="text-[11px] text-muted-foreground hover:text-foreground">
              Borrar
            </button>
          </div>
          <ul>
            {recent.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); setQ(r); runSearch(r); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60 active:bg-muted"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{r}</span>
                  <X
                    className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = recent.filter((x) => x !== r);
                      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                      setRecent(next);
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
