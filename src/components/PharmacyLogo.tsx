type Props = { slug: string; name?: string; size?: number; className?: string };

import locatelLogo from "@/assets/pharmacies/locatel.png";
import saasLogo from "@/assets/pharmacies/saas.png";
import actualLogo from "@/assets/pharmacies/actual.png";

// Real isotipos (favicon/logo image) per pharmacy when available.
const LOGO_IMG: Record<string, string> = {
  locatel: locatelLogo,
  saas: saasLogo,
  "farmacias-saas": saasLogo,
  actual: actualLogo,
};

// Brand color + initial per pharmacy. Used as a recognizable "isotipo" badge
// across cards, lists and tables. Inline SVG keeps it crisp at any size.
const BRAND: Record<string, { bg: string; fg: string; letter: string }> = {
  farmatodo: { bg: "#E30613", fg: "#FFFFFF", letter: "F" },
  locatel:   { bg: "#0066B3", fg: "#FFFFFF", letter: "L" },
  saas:      { bg: "#1E9E3E", fg: "#FFFFFF", letter: "S" },
  actual:    { bg: "#F39200", fg: "#FFFFFF", letter: "A" },
  farmago:   { bg: "#00A99D", fg: "#FFFFFF", letter: "G" },
  maraplus:  { bg: "#7C3AED", fg: "#FFFFFF", letter: "M" },
  cinecitta: { bg: "#0F172A", fg: "#FFFFFF", letter: "C" },
  gopharma:  { bg: "#0EA5E9", fg: "#FFFFFF", letter: "G" },
};

export function PharmacyLogo({ slug, name, size = 36, className }: Props) {
  const img = LOGO_IMG[slug];
  if (img) {
    return (
      <img
        src={img}
        alt={name ?? slug}
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: "50%", objectFit: "cover", background: "#FFFFFF" }}
        loading="lazy"
      />
    );
  }
  const b = BRAND[slug] ?? {
    bg: "#64748B",
    fg: "#FFFFFF",
    letter: (name ?? slug ?? "?").trim().charAt(0).toUpperCase() || "?",
  };
  return (
    <svg
      role="img"
      aria-label={name ?? slug}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
    >
      <circle cx="50" cy="50" r="48" fill={b.bg} />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontWeight="800"
        fontSize="56"
        fill={b.fg}
      >
        {b.letter}
      </text>
    </svg>
  );
}
