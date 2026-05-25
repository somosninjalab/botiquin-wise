import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "Es momento de hacernos la vida más fácil. Llegó ALERTA MEDICINA"
export const SickScene3Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineIn = spring({ frame, fps, config: { damping: 16 } });
  const lineY = interpolate(lineIn, [0, 1], [40, 0]);

  // logo bursts in
  const logoIn = spring({ frame: frame - 40, fps, config: { damping: 10, stiffness: 160 } });
  const logoRot = interpolate(logoIn, [0, 1], [-25, 0]);

  // brand name in
  const brandIn = spring({ frame: frame - 60, fps, config: { damping: 14 } });
  const brandY = interpolate(brandIn, [0, 1], [40, 0]);

  // pulse rings around logo
  const ringPhase = (frame - 80) / 30;
  const ringScale = interpolate(ringPhase, [0, 1], [1, 2.2], { extrapolateLeft: "clamp", extrapolateRight: "extend" });
  const ringOpacity = interpolate(ringPhase % 1, [0, 1], [0.6, 0]);

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.primary} x={-100} y={-100} size={460} />
      <FloatingBlob color={palette.yellow} x={780} y={1500} size={520} phase={15} />
      <Grain />

      <AbsoluteFill style={{ padding: "180px 70px 0", color: palette.ink, alignItems: "center" }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            textAlign: "center",
            transform: `translateY(${lineY}px)`,
            opacity: lineIn,
            color: palette.ink,
          }}
        >
          Es momento de <br />
          hacernos la vida <br />
          <span style={{ color: palette.accent }}>más fácil.</span>
        </div>

        {/* logo with pulse */}
        <div style={{ position: "relative", marginTop: 80, width: 320, height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {frame > 80 && (
            <div
              style={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: "50%",
                border: `6px solid ${palette.primary}`,
                transform: `scale(${ringScale})`,
                opacity: ringOpacity,
              }}
            />
          )}
          <div
            style={{
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: palette.white,
              border: `6px solid ${palette.ink}`,
              boxShadow: "10px 10px 0 #0B1B2B",
              transform: `scale(${logoIn}) rotate(${logoRot}deg)`,
              opacity: logoIn,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Img src={staticFile("logo.png")} style={{ width: 220, height: 220, objectFit: "contain" }} />
          </div>
        </div>

        <div
          style={{
            marginTop: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: `translateY(${brandY}px)`,
            opacity: brandIn,
          }}
        >
          <div style={{ fontFamily: body, fontSize: 32, color: palette.inkSoft, marginBottom: 8 }}>
            Llegó…
          </div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 88, lineHeight: 1, color: palette.primaryDeep, letterSpacing: -2 }}>
            ¡Alerta:
          </div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 88, lineHeight: 1, color: palette.ink, letterSpacing: -2 }}>
            Medicina!
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};