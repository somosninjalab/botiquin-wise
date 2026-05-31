import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const T4Honest = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 16 } });
  const s2 = spring({ frame: frame - 16, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        flexDirection: "column",
        gap: 36,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          color: COLORS.accent,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: s1,
          transform: `translateY(${interpolate(s1, [0, 1], [-20, 0])}px)`,
        }}
      >
        Aún estamos mejorando
      </div>
      <div
        style={{
          fontSize: 78,
          fontWeight: 900,
          color: COLORS.ink,
          textAlign: "center",
          letterSpacing: -2,
          lineHeight: 1.05,
          maxWidth: 940,
          opacity: s2,
          transform: `translateY(${interpolate(s2, [0, 1], [30, 0])}px)`,
        }}
      >
        Trabajamos cada día para traerte{" "}
        <span style={{ color: COLORS.primary }}>todas las medicinas</span>{" "}
        al <span style={{ color: COLORS.primary }}>mejor precio.</span>
      </div>
    </AbsoluteFill>
  );
};