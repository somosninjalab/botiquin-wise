import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const R4CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bell = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const ring = Math.sin(frame / 3) * interpolate(frame, [10, 30, 60], [0, 12, 5], { extrapolateRight: "clamp" });
  const line = spring({ frame: frame - 14, fps, config: { damping: 16 } });
  const brand = spring({ frame: frame - 32, fps, config: { damping: 12, stiffness: 150 } });
  const url = spring({ frame: frame - 52, fps, config: { damping: 14, stiffness: 140 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E5F5EE 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 960 }}>
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: "50%",
            background: COLORS.accent,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 60px -20px rgba(240,138,75,0.5)",
            transform: `scale(${bell}) rotate(${ring}deg)`,
            opacity: bell,
          }}
        >
          <svg width="104" height="104" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 62,
            fontWeight: 800,
            color: COLORS.muted,
            letterSpacing: -1,
            opacity: line,
            transform: `translateY(${interpolate(line, [0, 1], [28, 0])}px)`,
          }}
        >
          Antes de comprar medicinas:
        </div>

        <div
          style={{
            marginTop: 18,
            fontSize: 104,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -3,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: brand,
            transform: `scale(${interpolate(brand, [0, 1], [0.85, 1])})`,
          }}
        >
          ¡Alerta: Medicina!
        </div>

        <div
          style={{
            marginTop: 46,
            display: "inline-block",
            background: COLORS.ink,
            color: "#fff",
            fontSize: 54,
            fontWeight: 900,
            padding: "26px 50px",
            borderRadius: 999,
            letterSpacing: -1,
            opacity: url,
            transform: `scale(${url})`,
            boxShadow: "0 20px 50px -20px rgba(15,42,46,0.5)",
          }}
        >
          alertamedicina.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
