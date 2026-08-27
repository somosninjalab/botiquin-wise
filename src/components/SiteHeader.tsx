import { Link } from "@tanstack/react-router";
import { Bell, Instagram, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackShare } from "@/lib/track-share";
import logoUrl from "@/assets/logo.png";

export function SiteHeader() {
  const { user, isAdmin } = useAuth();

  const handleWhatsAppClick = () => {
    void trackShare({ channel: "whatsapp", source: "mobile_header", url: "https://whatsapp.com/channel/0029Vb8IEJ11Hsq4ANQNFw3G" });
    window.open("https://whatsapp.com/channel/0029Vb8IEJ11Hsq4ANQNFw3G", "_blank", "noopener,noreferrer");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-20 md:h-24 items-center justify-between px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 font-bold text-base sm:text-lg md:text-xl min-w-0 flex-1 md:flex-initial">
          <img src={logoUrl} alt="" className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl shadow-[var(--shadow-soft)] shrink-0" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">
            ¡Alerta: Medicina!
          </span>
          <span className="shrink-0 ml-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleWhatsAppClick}
            aria-label="Compartir por WhatsApp"
            className="md:hidden h-9 w-9 text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .19 5.31.19 11.86c0 2.09.55 4.13 1.6 5.93L0 24l6.37-1.67a11.86 11.86 0 0 0 5.67 1.44h.01c6.55 0 11.86-5.31 11.86-11.86 0-3.17-1.23-6.15-3.39-8.43zM12.05 21.4h-.01a9.54 9.54 0 0 1-4.86-1.33l-.35-.21-3.78.99 1.01-3.69-.23-.38a9.54 9.54 0 0 1-1.47-5.07c0-5.27 4.29-9.56 9.56-9.56 2.55 0 4.95.99 6.75 2.8a9.5 9.5 0 0 1 2.8 6.76c0 5.27-4.29 9.56-9.56 9.56zm5.24-7.16c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.91 1.12-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.43-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.45.13-.59.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.4 1.02 2.76 1.17 2.95.14.19 2.02 3.08 4.89 4.31.68.29 1.22.47 1.63.6.69.22 1.31.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z"/>
            </svg>
          </Button>
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
