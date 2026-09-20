import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const MetricScene = ({
  eyebrow,
  value,
  label,
  accent = COLORS.primary,
  children,
}: {
  eyebrow: string;
  value: string;
  label: string;
  accent?: string;
  children?: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const valueIn = spring({ frame: frame - 3, fps, config: { damping: 13, stiffness: 190 } });
  const labelIn = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 150 } });
  const line = interpolate(frame, [7, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const drift = Math.sin(frame / 9) * 5;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 78% 20%, ${accent}24 0%, ${COLORS.bg} 48%, #EAF7F1 100%)`,
        padding: "150px 72px 130px",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 100 + drift,
          right: -170,
          width: 520,
          height: 520,
          borderRadius: "50%",
          border: `76px solid ${accent}18`,
        }}
      />
      <div style={{ color: COLORS.muted, fontSize: 34, fontWeight: 800, textTransform: "uppercase" }}>
        {eyebrow}
      </div>
      <div
        style={{
          color: accent,
          fontSize: value.length > 7 ? 164 : 210,
          fontWeight: 900,
          lineHeight: 0.92,
          marginTop: 34,
          opacity: valueIn,
          transform: `translateY(${interpolate(valueIn, [0, 1], [90, 0])}px) scale(${interpolate(valueIn, [0, 1], [0.72, 1])})`,
          transformOrigin: "left center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ width: `${line * 100}%`, height: 12, background: accent, borderRadius: 12, margin: "34px 0" }} />
      <div
        style={{
          color: COLORS.ink,
          fontSize: 70,
          fontWeight: 900,
          lineHeight: 1.02,
          opacity: labelIn,
          transform: `translateX(${interpolate(labelIn, [0, 1], [-50, 0])}px)`,
        }}
      >
        {label}
      </div>
      {children}
    </AbsoluteFill>
  );
};
