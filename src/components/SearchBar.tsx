import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const navigate = useNavigate();
  useEffect(() => { setQ(initial); }, [initial]);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    if (onSearch) onSearch(value);
    else navigate({ to: "/", search: { q: value } });
  };
  return (
    <form onSubmit={onSubmit} role="search" className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${size === "lg" ? "h-5 w-5" : "h-4 w-4"}`} />
        <Input
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (liveUpdate && onSearch) onSearch(v);
          }}
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
    </form>
  );
}
