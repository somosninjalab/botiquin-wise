import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Barra de navegación inferior fija — solo móvil.
 * Altura ~64px + safe-area. La página agrega padding inferior equivalente.
 */
export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const items = [
    { to: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
    { to: "/buscar", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/buscar") },
    {
      to: user ? "/mis-alertas" : "/auth",
      label: "Alertas",
      icon: Bell,
      match: (p: string) => p.startsWith("/mis-alertas"),
    },
    {
      to: user ? "/mis-alertas" : "/auth",
      label: user ? "Cuenta" : "Entrar",
      icon: User,
      match: (p: string) => p.startsWith("/auth"),
    },
  ] as const;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link
                to={it.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 text-[11px] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} strokeWidth={active ? 2.5 : 2} />
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}