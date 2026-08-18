import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const R1Back = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kicker = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 170 } });
  const big = spring({ frame: frame - 16, fps, config: { damping: 13, stiffness: 150 } });
  const sub = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const pulse = 1 + Math.sin(frame / 9) * 0.015;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 32%, ${COLORS.primaryGlow}2E 0%, ${COLORS.bg} 62%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 950 }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 36,
            fontWeight: 900,
            color: "#fff",
            background: COLORS.accent,
            padding: "16px 34px",
            borderRadius: 999,
            letterSpacing: 5,
            textTransform: "uppercase",
            opacity: kicker,
            transform: `translateY(${interpolate(kicker, [0, 1], [30, 0])}px) scale(${kicker})`,
            boxShadow: "0 22px 45px -20px rgba(240,138,75,0.55)",
          }}
        >
          Volvimos
        </div>

        <div
          style={{
            marginTop: 46,
            fontSize: 124,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 0.98,
            letterSpacing: -4,
            opacity: big,
            transform: `translateY(${interpolate(big, [0, 1], [70, 0])}px) scale(${pulse})`,
          }}
        >
          Mejores{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            que nunca
          </span>
        </div>

        <div
          style={{
            marginTop: 44,
            fontSize: 42,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [24, 0])}px)`,
          }}
        >
          Ya estamos al 100%.
        </div>
      </div>
    </AbsoluteFill>
  );
};
