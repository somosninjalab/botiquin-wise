import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { display, body, palette } from "../../theme";

// Final CTA — strong, on-brand
export const ExScene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Brand-colored deep background with subtle radial movement
  const drift = Math.sin(frame / 30) * 30;

  const logoIn = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const titleIn = spring({ frame: frame - 14, fps, config: { damping: 16 } });
  const urlIn = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const followIn = spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 180 } });

  const titleY = interpolate(titleIn, [0, 1], [40, 0]);
  const urlY = interpolate(urlIn, [0, 1], [40, 0]);

  // url subtle pulse
  const pulse = 1 + Math.sin(frame / 6) * 0.015;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% 30%, ${palette.primary} 0%, ${palette.primaryDeep} 55%, #08332A 100%)`,
      }}
    >
      {/* soft accent blob */}
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: -120,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: palette.accent,
          filter: "blur(60px)",
          opacity: 0.35,
        }}
      />

      <AbsoluteFill
        style={{
          padding: "180px 70px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: palette.white,
            border: `6px solid ${palette.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "10px 10px 0 #08332A",
            transform: `scale(${logoIn}) rotate(${interpolate(logoIn, [0, 1], [-15, 0])}deg)`,
            opacity: logoIn,
            overflow: "hidden",
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: 170, height: 170, objectFit: "contain" }} />
        </div>

        <div
          style={{
            marginTop: 28,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1.05,
            color: palette.yellow,
            letterSpacing: -1.5,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          ¡Alerta:
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 76,
            lineHeight: 1.05,
            color: palette.white,
            letterSpacing: -1.5,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
            marginBottom: 18,
          }}
        >
          Medicina!
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 36,
            color: "#E8F5EE",
            opacity: titleIn,
            maxWidth: 800,
          }}
        >
          Gasta menos comprando medicinas.
        </div>

        {/* URL pill */}
        <div
          style={{
            marginTop: 50,
            padding: "26px 48px",
            borderRadius: 999,
            background: palette.white,
            border: `5px solid ${palette.ink}`,
            boxShadow: "10px 10px 0 #08332A",
            fontFamily: display,
            fontWeight: 700,
            fontSize: 52,
            color: palette.primaryDeep,
            transform: `translateY(${urlY}px) scale(${urlIn * pulse})`,
            opacity: urlIn,
          }}
        >
          alertamedicina.com
        </div>

        {/* Follow CTA */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "18px 32px",
            borderRadius: 999,
            background: palette.accent,
            border: `4px solid ${palette.ink}`,
            boxShadow: "6px 6px 0 #08332A",
            transform: `scale(${followIn}) rotate(${interpolate(followIn, [0, 1], [-6, 0])}deg)`,
            opacity: followIn,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 36,
            color: palette.white,
          }}
        >
          ❤ Síguenos para ahorrar
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};