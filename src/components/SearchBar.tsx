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
    <form onSubmit={onSubmit} className={`flex w-full gap-2 ${size === "lg" ? "" : ""}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (liveUpdate && onSearch) onSearch(v);
          }}
          placeholder="Busca por nombre comercial o principio activo (ej. ibuprofeno)"
          className={`pl-9 bg-card ${size === "lg" ? "h-14 text-base" : ""}`}
          maxLength={200}
        />
      </div>
      <Button type="submit" className={`bg-gradient-to-r from-primary to-primary-glow text-primary-foreground ${size === "lg" ? "h-14 px-6 text-base" : ""}`}>
        Buscar
      </Button>
    </form>
  );
}
