import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const T1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 160 } });
  const s2 = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 150 } });
  const s3 = spring({ frame: frame - 40, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${COLORS.primaryGlow}22 0%, ${COLORS.bg} 60%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 940 }}>
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: COLORS.accent,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: s1,
            transform: `translateY(${interpolate(s1, [0, 1], [30, 0])}px)`,
          }}
        >
          No lo podíamos creer…
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 116,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.0,
            letterSpacing: -3,
            opacity: s2,
            transform: `translateY(${interpolate(s2, [0, 1], [60, 0])}px)`,
          }}
        >
          No había forma de{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ahorrar
          </span>{" "}
          en medicinas.
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 40,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: s3,
          }}
        >
          Así que la creamos nosotros.
        </div>
      </div>
    </AbsoluteFill>
  );
};