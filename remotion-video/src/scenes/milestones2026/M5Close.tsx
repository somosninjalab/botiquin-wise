import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const M5Close = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flag = spring({ frame, fps, config: { damping: 11, stiffness: 180 } });
  const title = spring({ frame: frame - 10, fps, config: { damping: 17, stiffness: 155 } });
  const close = spring({ frame: frame - 42, fps, config: { damping: 15, stiffness: 180 } });
  const url = spring({ frame: frame - 64, fps, config: { damping: 16, stiffness: 170 } });
  const pulse = 1 + Math.sin(frame / 7) * 0.018;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(155deg, ${COLORS.primary} 0%, #08745C 100%)`, padding: "94px 68px", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -280, right: -280, width: 760, height: 760, borderRadius: "50%", border: "105px solid rgba(255,255,255,0.09)" }} />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div
          aria-label="Bandera de Venezuela"
          style={{
            width: 152,
            height: 112,
            margin: "0 auto",
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 18px 36px rgba(4,50,40,0.28)",
            transform: `scale(${flag}) rotate(${interpolate(flag, [0, 1], [-18, 0])}deg)`,
            opacity: flag,
          }}
        >
          <div style={{ height: "33.34%", background: "#F4D326" }} />
          <div style={{ height: "33.34%", background: "#174EA6", position: "relative" }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((star) => {
              const angle = Math.PI + (Math.PI * star) / 7;
              return (
                <div
                  key={star}
                  style={{
                    position: "absolute",
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: COLORS.card,
                    left: 72 + Math.cos(angle) * 43,
                    top: 27 + Math.sin(angle) * 15,
                  }}
                />
              );
            })}
          </div>
          <div style={{ height: "33.34%", background: "#CF2534" }} />
        </div>
        <div style={{ marginTop: 20, color: COLORS.card, fontSize: 61, fontWeight: 900, lineHeight: 1.02, opacity: title, transform: `translateY(${interpolate(title, [0, 1], [44, 0])}px)` }}>
          La primera plataforma de Venezuela para comparar precios de medicinas.
        </div>
        <div style={{ width: 120, height: 10, background: COLORS.accent, borderRadius: 10, margin: "40px auto" }} />
        <div style={{ color: COLORS.card, fontSize: 73, fontWeight: 900, lineHeight: 1, opacity: close, transform: `scale(${interpolate(close, [0, 1], [0.82, 1])})` }}>
          Antes de comprar medicinas,
          <span style={{ color: "#FFD7B8" }}> Alerta Medicina.</span>
        </div>
        <div style={{ margin: "52px auto 0", width: 164, height: 164, borderRadius: 34, overflow: "hidden", background: COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(4,50,40,0.32)", opacity: close, transform: `scale(${close * pulse})` }}>
          <Img src={staticFile("alerta-logo.png")} style={{ width: 164, height: 164, objectFit: "cover" }} />
        </div>
        <div style={{ marginTop: 36, display: "inline-block", color: COLORS.ink, background: COLORS.card, padding: "22px 42px", borderRadius: 18, fontSize: 43, fontWeight: 900, opacity: url, transform: `translateY(${interpolate(url, [0, 1], [35, 0])}px)` }}>
          alertamedicina.com
        </div>
      </div>
    </AbsoluteFill>
  );
};