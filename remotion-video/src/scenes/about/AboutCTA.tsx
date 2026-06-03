import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const AboutCTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 16 } });
  const urlS = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 160 } });
  const subS = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.primary} 0%, ${COLORS.primaryGlow} 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 960 }}>
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: -3,
            lineHeight: 1.0,
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
          }}
        >
          Únete hoy.
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            opacity: titleS,
          }}
        >
          Compara, ahorra y recibe alertas.
        </div>

        <div
          style={{
            marginTop: 60,
            display: "inline-block",
            background: COLORS.ink,
            color: "#fff",
            fontSize: 58,
            fontWeight: 900,
            padding: "28px 54px",
            borderRadius: 999,
            letterSpacing: -1,
            opacity: urlS,
            transform: `scale(${urlS * pulse})`,
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)",
          }}
        >
          alertamedicina.com
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 34,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            opacity: subS,
          }}
        >
          Gratis · En segundos
        </div>
      </div>
    </AbsoluteFill>
  );
};