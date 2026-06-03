import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS } from "../../theme";

export const AboutBrand = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, config: { damping: 12, stiffness: 160 } });
  const titleS = spring({ frame: frame - 12, fps, config: { damping: 16, stiffness: 140 } });
  const subS = spring({ frame: frame - 28, fps, config: { damping: 18 } });
  const pulse = 1 + Math.sin(frame / 8) * 0.015;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.primary} 0%, ${COLORS.primaryGlow} 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: 56,
            background: "#fff",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)",
            transform: `scale(${logoS * pulse}) rotate(${interpolate(logoS, [0, 1], [-12, 0])}deg)`,
            opacity: logoS,
          }}
        >
          <Img src={staticFile("alerta-logo.png")} style={{ width: 190, height: 190, objectFit: "contain" }} />
        </div>
        <div
          style={{
            marginTop: 60,
            fontSize: 130,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: -3,
            lineHeight: 1.0,
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
          }}
        >
          Alerta
          <br />
          Medicina
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: 1,
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [20, 0])}px)`,
          }}
        >
          Compara antes de pagar.
        </div>
      </div>
    </AbsoluteFill>
  );
};