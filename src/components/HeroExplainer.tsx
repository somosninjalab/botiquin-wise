import { Search, Pill, Bell, Check } from "lucide-react";
import { PharmacyLogo } from "@/components/PharmacyLogo";

/**
 * Animación visual del hero pensada para personas mayores de 50:
 * 1) Una lupa "busca" la medicina
 * 2) Aparecen las 4 farmacias reales con sus precios
 * 3) Se resalta la más barata con un check verde y "te avisamos"
 *
 * Sin video, sin logos generados por IA. Solo CSS + SVG nítidos.
 * El ciclo dura 12s y se repite en bucle.
 */

const PHARMACIES = [
  { name: "Farmatodo", slug: "farmatodo", price: "Bs. 240" },
  { name: "Locatel",   slug: "locatel",   price: "Bs. 198" },
  { name: "SAAS",      slug: "saas",      price: "Bs. 96", best: true },
  { name: "Farmago",   slug: "farmago",   price: "Bs. 215" },
];

export function HeroExplainer() {
  return (
    <div
      className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 shadow-[var(--shadow-elevated)]"
      role="img"
      aria-label="Animación: Alerta Medicina busca tu medicamento, compara Farmatodo, Locatel, SAAS y Farmago, y te avisa cuando baja el precio."
    >
      {/* PASO 1 — Lupa buscando la medicina (0s → 4s) */}
      <div className="absolute inset-0 flex items-center justify-center hero-step-1">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="rounded-2xl bg-card border-2 border-border shadow-lg p-5 flex items-center gap-3">
              <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                <Pill className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base font-bold leading-tight text-foreground">Mi medicina</div>
                <div className="text-sm text-muted-foreground">Acetaminofén 500 mg</div>
              </div>
            </div>
            {/* Lupa que se mueve */}
            <div className="absolute -top-3 -right-3 hero-magnify text-primary">
              <div className="rounded-full bg-card border-2 border-primary shadow-lg p-2">
                <Search className="h-6 w-6" strokeWidth={2.8} />
              </div>
            </div>
          </div>
          <div className="text-base font-semibold text-muted-foreground">Buscando…</div>
        </div>
      </div>

      {/* PASO 2 — Comparando 4 farmacias (4s → 8s) */}
      <div className="absolute inset-0 p-4 sm:p-6 hero-step-2">
        <div className="text-center text-sm sm:text-base font-bold text-muted-foreground mb-3">
          Comparando 4 farmacias
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md mx-auto">
          {PHARMACIES.map((p, i) => (
            <div
              key={p.name}
              className="hero-pharm-card rounded-xl bg-card border-2 border-border px-3 py-2.5 flex items-center justify-between shadow-sm"
              style={{ animationDelay: `${4.2 + i * 0.25}s` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <PharmacyLogo slug={p.slug} name={p.name} size={28} className="rounded-lg shrink-0" />
                <span className="font-bold text-sm sm:text-base text-foreground truncate">{p.name}</span>
              </div>
              <span className="font-extrabold text-sm sm:text-base text-foreground tabular-nums">
                {p.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PASO 3 — La más barata gana (8s → 12s) */}
      <div className="absolute inset-0 flex items-center justify-center p-4 hero-step-3">
        <div className="flex flex-col items-center gap-4 max-w-sm w-full">
          <div className="rounded-2xl bg-card border-4 border-primary shadow-[var(--shadow-elevated)] px-6 py-5 w-full hero-pop">
            <div className="flex items-center gap-3 mb-3">
              <PharmacyLogo slug="saas" name="SAAS" size={40} className="rounded-xl" />
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-foreground">SAAS</div>
                <div className="text-xs text-muted-foreground">Mejor precio</div>
              </div>
              <div className="rounded-full bg-primary text-primary-foreground p-1.5">
                <Check className="h-5 w-5" strokeWidth={3.5} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-3xl sm:text-4xl font-extrabold text-primary leading-none">
                Bs. 96
              </div>
              <div className="text-sm font-bold text-accent">↓ Ahorras 60%</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-accent/15 px-4 py-2 text-sm sm:text-base font-semibold text-foreground hero-bell">
            <Bell className="h-5 w-5 text-accent" />
            <span>Te avisamos cuando baje más</span>
          </div>
        </div>
      </div>

      {/* Estilos de animación: 12s en bucle, 3 escenas de 4s con cross-fade */}
      <style>{`
        @keyframes heroStep1 {
          0%, 28% { opacity: 1; transform: translateY(0); }
          33%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes heroStep2 {
          0%, 30% { opacity: 0; transform: translateY(8px); }
          35%, 62% { opacity: 1; transform: translateY(0); }
          67%, 100% { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes heroStep3 {
          0%, 64% { opacity: 0; transform: translateY(8px); }
          69%, 96% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; }
        }
        @keyframes heroMagnify {
          0%   { transform: translate(0, 0) rotate(-10deg); }
          25%  { transform: translate(-90px, 18px) rotate(-15deg); }
          50%  { transform: translate(-50px, -10px) rotate(5deg); }
          75%  { transform: translate(-110px, 8px) rotate(-12deg); }
          100% { transform: translate(0, 0) rotate(-10deg); }
        }
        @keyframes heroPharmCard {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes heroPop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes heroBellRing {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-4deg); }
          80% { transform: rotate(4deg); }
        }
        .hero-step-1 { animation: heroStep1 12s ease-in-out infinite; }
        .hero-step-2 { animation: heroStep2 12s ease-in-out infinite; opacity: 0; }
        .hero-step-3 { animation: heroStep3 12s ease-in-out infinite; opacity: 0; }
        .hero-magnify { animation: heroMagnify 3.5s ease-in-out infinite; }
        .hero-pharm-card { animation: heroPharmCard 0.5s ease-out both; }
        .hero-pop { animation: heroPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: 8.2s; }
        .hero-bell { animation: heroBellRing 1.2s ease-in-out infinite; animation-delay: 9s; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .hero-step-1, .hero-step-2, .hero-step-3, .hero-magnify, .hero-pharm-card, .hero-pop, .hero-bell {
            animation: none !important;
          }
          .hero-step-1 { opacity: 1; }
          .hero-step-2, .hero-step-3 { opacity: 0; }
        }
      `}</style>
    </div>
  );
}