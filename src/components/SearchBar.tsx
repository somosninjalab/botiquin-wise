import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ initial = "", size = "md" }: { initial?: string; size?: "md" | "lg" }) {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/buscar", search: { q: q.trim() } });
  };
  return (
    <form onSubmit={onSubmit} className={`flex w-full gap-2 ${size === "lg" ? "" : ""}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
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
