import { Link } from "@tanstack/react-router";
import { Bell, Instagram, LayoutDashboard, LogIn, LogOut, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.png";
import { useOrder } from "@/lib/order-store";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const order = useOrder();
  const count = order.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-base md:text-lg min-w-1">
          <img src={logoUrl} alt="" className="h-12 w-12 md:h-14 md:w-14 rounded-xl shadow-[var(--shadow-soft)] shrink-0" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
            ¡Alerta: Medicina!
          </span>
          <span className="shrink-0 ml-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Beta
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/" className="px-3 py-2 rounded-md hover:bg-muted transition-colors">Inicio</Link>
          <Link to="/buscar" className="px-3 py-2 rounded-md hover:bg-muted transition-colors">Buscar</Link>
          <Link to="/como-funciona" className="px-3 py-2 rounded-md hover:bg-muted transition-colors">Cómo funciona</Link>
          <Link to="/mi-orden" className="px-3 py-2 rounded-md hover:bg-muted transition-colors">Mi orden</Link>
          {user && (
            <Link to="/mis-alertas" className="px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-1">
              <Bell className="h-4 w-4" /> Mis alertas
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-1">
              <LayoutDashboard className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          <a
            href="https://instagram.com/alerta.medicina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram @alerta.medicina"
            className="hidden md:inline-flex"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Instagram className="h-5 w-5" />
            </Button>
          </a>
          <a
            href="https://tiktok.com/@alerta.medicina"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok @alerta.medicina"
            className="hidden md:inline-flex"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
              </svg>
            </Button>
          </a>
          <Link to="/mi-orden" aria-label="Mi orden" className="relative">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/mis-alertas" className="hidden sm:flex">
                <Button variant="ghost" size="sm"><User className="h-4 w-4 mr-1" /> {user.email?.split("@")[0]}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                <LogIn className="h-4 w-4 mr-1" /> Entrar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
