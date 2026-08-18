import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

const ITEMS = [
  { t: "9 farmacias, una sola búsqueda", c: COLORS.primary },
  { t: "Precios en segundos, no en horas", c: COLORS.accent },
  { t: "Alertas cuando baja tu medicina", c: COLORS.ink },
];

export const R2Better = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 18, stiffness: 150 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E9F6F0 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
        flexDirection: "column",
        gap: 40,
      }}
    >
      <div
        style={{
          fontSize: 78,
          fontWeight: 900,
          color: COLORS.ink,
          letterSpacing: -2,
          textAlign: "center",
          lineHeight: 1.05,
          opacity: head,
          transform: `translateY(${interpolate(head, [0, 1], [40, 0])}px)`,
        }}
      >
        Conseguí tus medicinas
        <br />
        <span style={{ color: COLORS.primary }}>al mejor precio</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26, width: "100%", maxWidth: 900 }}>
        {ITEMS.map((it, i) => {
          const s = spring({ frame: frame - 18 - i * 14, fps, config: { damping: 15, stiffness: 140 } });
          return (
            <div
              key={it.t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                background: "#fff",
                border: `2px solid ${COLORS.border}`,
                borderRadius: 28,
                padding: "30px 34px",
                boxShadow: "0 24px 50px -34px rgba(15,42,46,0.45)",
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-70, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  background: it.c,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>{it.t}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
