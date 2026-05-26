import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { display, body, palette } from "../../theme";

export const PainScene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drift = Math.sin(frame / 30) * 30;

  const logoIn = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const t1In = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const urlIn = spring({ frame: frame - 36, fps, config: { damping: 12 } });
  const followIn = spring({ frame: frame - 64, fps, config: { damping: 10, stiffness: 180 } });
  const handlesIn = spring({ frame: frame - 88, fps, config: { damping: 14 } });

  const pulse = 1 + Math.sin(frame / 6) * 0.018;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% 30%, ${palette.primary} 0%, ${palette.primaryDeep} 55%, #08332A 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -120,
          top: -120,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: palette.yellow,
          filter: "blur(60px)",
          opacity: 0.3,
        }}
      />
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
          opacity: 0.4,
        }}
      />

      <AbsoluteFill style={{ padding: "200px 70px", alignItems: "center", justifyContent: "flex-start" }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 40,
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
          <Img src={staticFile("logo.png")} style={{ width: 180, height: 180, objectFit: "contain" }} />
        </div>

        <div
          style={{
            marginTop: 36,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.0,
            color: palette.yellow,
            letterSpacing: -2,
            textAlign: "center",
            transform: `translateY(${interpolate(t1In, [0, 1], [40, 0])}px)`,
            opacity: t1In,
          }}
        >
          Entra ya:
        </div>

        {/* URL pill */}
        <div
          style={{
            marginTop: 36,
            padding: "30px 54px",
            borderRadius: 999,
            background: palette.white,
            border: `5px solid ${palette.ink}`,
            boxShadow: "10px 10px 0 #08332A",
            fontFamily: display,
            fontWeight: 700,
            fontSize: 56,
            color: palette.primaryDeep,
            transform: `translateY(${interpolate(urlIn, [0, 1], [40, 0])}px) scale(${urlIn * pulse})`,
            opacity: urlIn,
          }}
        >
          alertamedicina.com
        </div>

        {/* Follow CTA */}
        <div
          style={{
            marginTop: 48,
            padding: "22px 38px",
            borderRadius: 999,
            background: palette.accent,
            border: `5px solid ${palette.ink}`,
            boxShadow: "8px 8px 0 #08332A",
            transform: `scale(${followIn}) rotate(${interpolate(followIn, [0, 1], [-6, 0])}deg)`,
            opacity: followIn,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 44,
            color: palette.white,
            textAlign: "center",
          }}
        >
          ❤ Síguenos
        </div>

        <div
          style={{
            marginTop: 30,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            opacity: handlesIn,
            transform: `translateY(${interpolate(handlesIn, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: body,
              fontWeight: 600,
              fontSize: 34,
              color: "#E8F5EE",
            }}
          >
            @alertamedicina
          </div>
          <div
            style={{
              fontFamily: body,
              fontWeight: 600,
              fontSize: 28,
              color: palette.yellow,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            y ahorra en cada compra
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};