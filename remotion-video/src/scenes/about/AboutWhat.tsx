import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

const BULLETS = [
  { n: "1", text: "Busca tu medicina" },
  { n: "2", text: "Compara precios en farmacias" },
  { n: "3", text: "Te avisamos cuando baje" },
];

export const AboutWhat = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headS = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${COLORS.primaryGlow}22 0%, ${COLORS.bg} 65%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: COLORS.accent,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: headS,
          transform: `translateY(${interpolate(headS, [0, 1], [-20, 0])}px)`,
        }}
      >
        ¿Qué es?
      </div>
      <div
        style={{
          fontSize: 78,
          fontWeight: 900,
          color: COLORS.ink,
          letterSpacing: -2,
          lineHeight: 1.05,
          textAlign: "center",
          maxWidth: 900,
          opacity: titleS,
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
        }}
      >
        La web que te ayuda a
        <br />
        <span style={{ color: COLORS.primary }}>gastar menos</span> en medicinas.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: "100%",
          maxWidth: 880,
          marginTop: 16,
        }}
      >
        {BULLETS.map((b, i) => {
          const startF = 24 + i * 14;
          const enter = spring({ frame: frame - startF, fps, config: { damping: 14, stiffness: 140 } });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                background: COLORS.card,
                borderRadius: 28,
                padding: "22px 34px",
                border: `3px solid ${COLORS.border}`,
                boxShadow: "0 16px 40px -22px rgba(15,42,46,0.18)",
                transform: `translateX(${interpolate(enter, [0, 1], [-80, 0])}px)`,
                opacity: enter,
              }}
            >
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: "50%",
                  background: COLORS.primary,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {b.n}
              </div>
              <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.ink, lineHeight: 1.2 }}>
                {b.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};