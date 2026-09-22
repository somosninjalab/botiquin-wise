import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../../theme";
import { Phone, StepBadge, TutorialBackground } from "./shared";

export const How3Search = () => {
  const frame = useCurrentFrame();
  const cursorX = interpolate(frame, [8, 32, 55, 75], [780, 655, 810, 810], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [8, 32, 55, 75], [1220, 520, 520, 520], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const press = interpolate(frame, [28, 34, 40, 55, 61, 67], [1, .7, 1, 1, .68, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <TutorialBackground>
    <div style={{ padding: "82px 62px 0", position: "relative", zIndex: 2 }}><StepBadge number="2" label="Busca tu medicina" /><div style={{ color: COLORS.primary, fontSize: 34, fontWeight: 800, margin: "22px 0 0 92px" }}>Ejemplo real: Atamel</div></div>
    <div style={{ position: "absolute", left: 176, top: 310 }}><Phone image="step2-search.png" /></div>
    <div style={{ position: "absolute", left: cursorX, top: cursorY, zIndex: 9, transform: `scale(${press})`, transformOrigin: "top left", filter: "drop-shadow(0 8px 8px rgba(15,42,46,.3))" }}><div style={{ width: 0, height: 0, borderLeft: "22px solid transparent", borderRight: "7px solid transparent", borderBottom: `58px solid ${COLORS.ink}`, transform: "rotate(-38deg)" }} /><div style={{ width: 26, height: 48, background: COLORS.ink, borderRadius: 8, transform: "rotate(-38deg) translate(9px,-12px)" }} /></div>
  </TutorialBackground>;
};
