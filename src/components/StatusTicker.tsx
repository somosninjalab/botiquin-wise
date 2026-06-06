import { AlertTriangle } from "lucide-react";

const MESSAGE =
  "Estamos experimentando complicaciones técnicas debido al gran tráfico recibido. Trabajamos para solventarlo a la brevedad posible. Gracias por tu paciencia.";

export function StatusTicker() {
  // Repeat message so the marquee loops seamlessly
  const items = Array.from({ length: 4 }, (_, i) => i);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative w-full overflow-hidden border-b border-accent/30 bg-gradient-to-r from-accent/15 via-accent/10 to-accent/15 text-foreground"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="relative flex-1 overflow-hidden">
          <div className="flex w-max animate-ticker gap-12 whitespace-nowrap">
            {items.map((i) => (
              <span key={i} className="font-medium">
                {MESSAGE}
              </span>
            ))}
            {items.map((i) => (
              <span key={`dup-${i}`} className="font-medium" aria-hidden="true">
                {MESSAGE}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
