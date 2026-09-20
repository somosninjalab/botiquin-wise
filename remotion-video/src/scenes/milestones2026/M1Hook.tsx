import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const M1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const first = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const second = spring({ frame: frame - 11, fps, config: { damping: 14, stiffness: 180 } });
  const badge = spring({ frame: frame - 28, fps, config: { damping: 12, stiffness: 180 } });
  const sweep = interpolate(frame, [0, 55], [-1200, 1400], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.ink, padding: 76, justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(145deg, ${COLORS.ink}, #174D48)` }} />
      <div style={{ position: "absolute", width: 1500, height: 220, background: COLORS.primary, transform: `translateX(${sweep}px) rotate(-18deg)`, opacity: 0.42 }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 104, lineHeight: 0.95, fontWeight: 900, color: COLORS.card, opacity: first, transform: `translateY(${interpolate(first, [0, 1], [60, 0])}px)` }}>
          YA NO TIENES
        </div>
        <div style={{ marginTop: 18, fontSize: 132, lineHeight: 0.9, fontWeight: 900, color: COLORS.accent, opacity: second, transform: `scale(${interpolate(second, [0, 1], [0.76, 1])})`, transformOrigin: "left center" }}>
          QUE PAGAR MÁS
        </div>
        <div style={{ marginTop: 30, fontSize: 76, lineHeight: 1, fontWeight: 900, color: COLORS.card, opacity: second }}>
          por tus medicinas.
        </div>
        <div style={{ display: "inline-flex", marginTop: 62, padding: "18px 30px", borderRadius: 18, background: COLORS.primary, color: COLORS.card, fontSize: 34, fontWeight: 800, opacity: badge, transform: `translateX(${interpolate(badge, [0, 1], [-70, 0])}px)` }}>
          ALGO ESTÁ CAMBIANDO
        </div>
      </div>
    </AbsoluteFill>
  );
};
