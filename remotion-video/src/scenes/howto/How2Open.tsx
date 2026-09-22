import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";
import { Phone, StepBadge, TutorialBackground } from "./shared";

export const How2Open = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const answer = spring({ frame, fps, config: { damping: 15, stiffness: 180 } });
  const tap = interpolate(frame, [38, 47, 58], [1, .72, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <TutorialBackground>
    <div style={{ padding: "74px 62px 0", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, color: COLORS.primary, fontSize: 62, fontWeight: 900, opacity: answer, transform: `translateX(${interpolate(answer,[0,1],[-70,0])}px)` }}><Img src={staticFile("alerta-logo.png")} style={{ width: 84, height: 84, borderRadius: 20 }} />USANDO ALERTA MEDICINA</div>
      <div style={{ marginTop: 34 }}><StepBadge number="1" label="Entra desde tu navegador" /></div>
    </div>
    <div style={{ position: "absolute", left: 176, top: 345 }}><Phone image="step1-home.png" browser /></div>
    <div style={{ position: "absolute", zIndex: 8, top: 421, left: 340, width: 402, height: 64, border: `5px solid ${COLORS.accent}`, borderRadius: 34, transform: `scale(${tap})`, boxShadow: `0 0 0 14px ${COLORS.accent}22` }} />
  </TutorialBackground>;
};
