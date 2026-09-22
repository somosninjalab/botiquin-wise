import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";
import { Phone, StepBadge, TutorialBackground } from "./shared";

export const How4Best = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ring = spring({ frame: frame - 25, fps, config: { damping: 12, stiffness: 180 } });
  const check = spring({ frame: frame - 40, fps, config: { damping: 10, stiffness: 210 } });
  return <TutorialBackground>
    <div style={{ padding: "78px 62px 0", position: "relative", zIndex: 2 }}><StepBadge number="3" label="Elige el mejor precio" /><div style={{ margin: "18px 0 0 92px", color: COLORS.muted, fontSize: 30, fontWeight: 700 }}>Solo revisa “Coincidencia Exacta”</div></div>
    <div style={{ position: "absolute", left: 176, top: 282 }}><Phone image="step3-results.png" /></div>
    <div style={{ position: "absolute", zIndex: 7, left: 193, top: 1048, width: 692, height: 380, border: `7px solid ${COLORS.accent}`, borderRadius: 34, opacity: ring, transform: `scale(${interpolate(ring,[0,1],[.86,1])})`, boxShadow: `0 0 0 16px ${COLORS.accent}24` }} />
    <div style={{ position: "absolute", zIndex: 9, right: 100, top: 1302, width: 98, height: 98, borderRadius: "50%", background: COLORS.primary, color: COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 65, fontWeight: 900, opacity: check, transform: `scale(${check})` }}>✓</div>
  </TutorialBackground>;
};
