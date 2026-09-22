import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const PHONE_W = 728;
export const PHONE_H = 1576;

export const StepBadge = ({ number, label }: { number: string; label: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 190 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [-28, 0])}px)` }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: COLORS.accent, color: COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 900, boxShadow: "0 12px 24px rgba(240,138,75,.28)" }}>{number}</div>
      <div style={{ color: COLORS.ink, fontSize: 44, lineHeight: 1, fontWeight: 900 }}>{label}</div>
    </div>
  );
};

export const Phone = ({ image, browser = false, zoom = 1, y = 0, children }: { image: string; browser?: boolean; zoom?: number; y?: number; children?: ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 145 } });
  return (
    <div style={{ width: PHONE_W, height: PHONE_H, borderRadius: 72, background: "#102B2E", padding: 18, boxShadow: "0 46px 90px rgba(15,42,46,.28)", position: "relative", overflow: "hidden", opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [120, 0])}px) scale(${interpolate(enter, [0, 1], [.92, 1])})` }}>
      <div style={{ position: "absolute", zIndex: 4, top: 12, left: "50%", transform: "translateX(-50%)", width: 190, height: 38, borderRadius: 24, background: "#102B2E" }} />
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", background: COLORS.bg }}>
        {browser && <div style={{ height: 108, background: "#EBF4F0", padding: "44px 22px 12px", display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 3 }}><div style={{ fontSize: 26, color: COLORS.muted }}>‹</div><div style={{ flex: 1, height: 46, borderRadius: 23, background: COLORS.card, border: `2px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.ink, fontWeight: 700, fontSize: 20 }}>🔒 alertamedicina.com</div><div style={{ color: COLORS.muted, fontSize: 25 }}>⋯</div></div>}
        <Img src={staticFile(`tutorial/${image}`)} style={{ width: "100%", height: browser ? "calc(100% - 108px)" : "100%", objectFit: "cover", objectPosition: "top center", transform: `translateY(${y}px) scale(${zoom})`, transformOrigin: "top center" }} />
        {children}
      </div>
    </div>
  );
};

export const TutorialBackground = ({ children }: { children: ReactNode }) => (
  <AbsoluteFill style={{ background: `linear-gradient(155deg, ${COLORS.bg} 0%, #E7F7EF 58%, #FFF1E7 100%)`, fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: -270, top: 470, width: 680, height: 680, borderRadius: "50%", border: `92px solid ${COLORS.primary}12` }} />
    <div style={{ position: "absolute", right: -260, bottom: 190, width: 620, height: 620, borderRadius: "50%", border: `78px solid ${COLORS.accent}14` }} />
    {children}
  </AbsoluteFill>
);
