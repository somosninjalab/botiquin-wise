import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

const PROBLEMS = [
  { icon: "💸", text: "Pagas de más sin saberlo" },
  { icon: "🏃", text: "Recorres farmacias buscando precio" },
  { icon: "📈", text: "Los precios cambian todo el tiempo" },
];

export const T2Problems = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
        flexDirection: "column",
        gap: 50,
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.ink,
          textAlign: "center",
          letterSpacing: -2,
          lineHeight: 1.05,
          opacity: headerS,
          transform: `translateY(${interpolate(headerS, [0, 1], [-30, 0])}px)`,
          maxWidth: 940,
        }}
      >
        Comprar medicinas
        <br />
        <span style={{ color: COLORS.accent }}>no debería doler.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26, width: "100%", maxWidth: 920 }}>
        {PROBLEMS.map((p, i) => {
          const d = 14 + i * 12;
          const s = spring({ frame: frame - d, fps, config: { damping: 16, stiffness: 160 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                background: COLORS.card,
                borderRadius: 28,
                padding: "26px 36px",
                border: `3px solid ${COLORS.border}`,
                boxShadow: "0 14px 40px -16px rgba(15,42,46,0.18)",
                transform: `translateX(${interpolate(s, [0, 1], [-160, 0])}px)`,
                opacity: s,
              }}
            >
              <div style={{ fontSize: 64, lineHeight: 1 }}>{p.icon}</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, flex: 1, lineHeight: 1.15 }}>
                {p.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};