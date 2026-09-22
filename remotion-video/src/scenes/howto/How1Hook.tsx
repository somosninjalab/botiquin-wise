import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const How1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 16, stiffness: 185 } });
  const b = spring({ frame: frame - 9, fps, config: { damping: 13, stiffness: 190 } });
  const underline = interpolate(frame, [18, 46], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: `linear-gradient(150deg, ${COLORS.ink}, #155249)`, padding: "150px 70px", justifyContent: "center", overflow: "hidden", fontFamily: "Arial, sans-serif" }}>
    <div style={{ position: "absolute", width: 1200, height: 250, left: interpolate(frame, [0, 55], [-1250, 1150]), top: 310, background: COLORS.primary, opacity: .34, transform: "rotate(-15deg)" }} />
    <div style={{ color: COLORS.card, fontSize: 82, lineHeight: .98, fontWeight: 900, opacity: a, transform: `translateY(${interpolate(a, [0,1], [70,0])}px)` }}>¿QUIERES SABER CÓMO</div>
    <div style={{ color: COLORS.accent, fontSize: 128, lineHeight: .88, fontWeight: 900, marginTop: 28, opacity: b, transform: `scale(${interpolate(b,[0,1],[.75,1])})`, transformOrigin: "left center" }}>PAGAR MENOS</div>
    <div style={{ color: COLORS.card, fontSize: 74, lineHeight: 1, fontWeight: 900, marginTop: 28, opacity: b }}>por tus medicinas<br/>en Venezuela?</div>
    <div style={{ marginTop: 50, height: 12, width: `${underline * 78}%`, borderRadius: 8, background: COLORS.primaryGlow }} />
  </AbsoluteFill>;
};
