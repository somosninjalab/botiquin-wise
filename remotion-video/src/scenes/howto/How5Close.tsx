import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../../theme";

export const How5Close = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 12, stiffness: 175 } });
  const price = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 185 } });
  const line = spring({ frame: frame - 32, fps, config: { damping: 17, stiffness: 150 } });
  return <div style={{ width: "100%", height: "100%", background: `linear-gradient(155deg, ${COLORS.primary}, #08745C)`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
    <div style={{ position: "absolute", width: 880, height: 880, borderRadius: "50%", border: "115px solid rgba(255,255,255,.08)", right: -360, top: -330 }} />
    <div style={{ padding: 70, position: "relative" }}>
      <Img src={staticFile("alerta-logo.png")} style={{ width: 170, height: 170, borderRadius: 38, margin: "0 auto 34px", boxShadow: "0 24px 58px rgba(4,50,40,.32)", opacity: logo, transform: `scale(${logo}) rotate(${interpolate(logo,[0,1],[-12,0])}deg)` }} />
      <div style={{ color: "#DDF8ED", fontSize: 38, fontWeight: 800 }}>MEJOR PRECIO ENCONTRADO</div>
      <div style={{ color: COLORS.card, fontSize: 132, lineHeight: .9, fontWeight: 900, marginTop: 22, opacity: price, transform: `scale(${interpolate(price,[0,1],[.72,1])})` }}>Bs. 1.508,77</div>
      <div style={{ color: "#DDF8ED", fontSize: 42, fontWeight: 800, marginTop: 22 }}>Atamel · Farmadon</div>
      <div style={{ width: 130, height: 10, borderRadius: 10, background: COLORS.accent, margin: "54px auto" }} />
      <div style={{ color: COLORS.card, fontSize: 72, lineHeight: .98, fontWeight: 900, opacity: line, transform: `translateY(${interpolate(line,[0,1],[45,0])}px)` }}>Antes de comprar medicinas,<br/><span style={{ color: "#FFD8BF" }}>Alerta Medicina.</span></div>
      <div style={{ display: "inline-block", marginTop: 50, background: COLORS.card, color: COLORS.ink, borderRadius: 20, padding: "20px 38px", fontSize: 42, fontWeight: 900, opacity: line }}>alertamedicina.com</div>
    </div>
  </div>;
};
