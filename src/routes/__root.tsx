import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import logoUrl from "@/assets/logo.png";
import { AuthProvider } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { AssistantBubble } from "@/components/chat/AssistantBubble";
import { MobileBottomNav } from "@/components/MobileBottomNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "¡Alerta: Medicina! — Compara precios de medicamentos" },
      { name: "description", content: "Compara en tiempo real los precios de medicamentos en Farmatodo, SAAS, Maraplus y Locatel. Recibe alertas cuando bajen de precio." },
      { name: "author", content: "Alerta Medicina" },
      { property: "og:title", content: "¡Alerta: Medicina! — Compara precios de medicamentos" },
      { property: "og:description", content: "Compara en tiempo real los precios de medicamentos en Farmatodo, SAAS, Maraplus y Locatel. Recibe alertas cuando bajen de precio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "¡Alerta: Medicina! — Compara precios de medicamentos" },
      { name: "twitter:description", content: "Compara en tiempo real los precios de medicamentos en Farmatodo, SAAS, Maraplus y Locatel. Recibe alertas cuando bajen de precio." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d049554d-6efb-4d1e-8da8-49cfa392c68e/id-preview-fba2e9dd--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app-1777954305268.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d049554d-6efb-4d1e-8da8-49cfa392c68e/id-preview-fba2e9dd--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app-1777954305268.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: logoUrl },
      { rel: "apple-touch-icon", href: logoUrl },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4 flex flex-col items-center gap-2">
            <div>¡Alerta: Medicina! · Comparador gratuito de precios de medicamentos</div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              <Link to="/legal" hash="terminos" className="hover:text-foreground transition-colors">
                Términos y Condiciones
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal" hash="privacidad" className="hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <span aria-hidden="true">·</span>
              <Link to="/legal" hash="cookies" className="hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
            <div className="text-[10px] text-muted-foreground/60 tracking-wide uppercase">
              v2.0 · Edición Mayor
            </div>
          </div>
        </footer>
      </div>
      <MobileBottomNav />
      <AssistantBubble />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
