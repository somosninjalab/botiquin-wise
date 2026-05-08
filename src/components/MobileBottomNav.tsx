import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, ShoppingCart, Bell, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrder } from "@/lib/order-store";

/**
 * Barra de navegación inferior fija — solo móvil.
 * Altura ~64px + safe-area. La página agrega padding inferior equivalente.
 */
export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const order = useOrder();
  const count = order.reduce((s, i) => s + i.quantity, 0);

  const items = [
    { to: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
    { to: "/buscar", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/buscar") },
    {
      to: "/mi-orden",
      label: "Orden",
      icon: ShoppingCart,
      match: (p: string) => p.startsWith("/mi-orden"),
      badge: count,
    },
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
  ] as Array<{ to: string; label: string; icon: typeof Home; match: (p: string) => boolean; badge?: number }>;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-5">
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
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} strokeWidth={active ? 2.5 : 2} />
                  {it.badge && it.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {it.badge > 99 ? "99+" : it.badge}
                    </span>
                  ) : null}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}