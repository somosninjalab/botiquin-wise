import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s1 = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 160 } });
  const s2 = spring({ frame: frame - 22, fps, config: { damping: 14, stiffness: 160 } });
  const s3 = spring({ frame: frame - 42, fps, config: { damping: 12, stiffness: 140 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${COLORS.primaryGlow}22 0%, ${COLORS.bg} 60%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 920 }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: COLORS.accent,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: s1,
            transform: `translateY(${interpolate(s1, [0, 1], [30, 0])}px)`,
          }}
        >
          Espera…
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 132,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.0,
            letterSpacing: -3,
            opacity: s2,
            transform: `translateY(${interpolate(s2, [0, 1], [60, 0])}px) scale(${interpolate(s2, [0, 1], [0.9, 1]) * pulse})`,
          }}
        >
          ¿Pagas{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.accent}, #E0571B)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            de más
          </span>
          <br />por tus medicinas?
        </div>
        <div
          style={{
            marginTop: 60,
            fontSize: 40,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: s3,
            transform: `translateY(${interpolate(s3, [0, 1], [20, 0])}px)`,
          }}
        >
          La diferencia puede ser brutal.
        </div>
      </div>
    </AbsoluteFill>
  );
};