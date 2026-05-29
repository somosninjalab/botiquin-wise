import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const BrandClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const word1 = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const word2 = spring({ frame: frame - 32, fps, config: { damping: 14 } });
  const tag = spring({ frame: frame - 56, fps, config: { damping: 16 } });
  const url = spring({ frame: frame - 88, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill>
      <BrandBackdrop tone="deep" />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 360,
          marginLeft: -130,
          width: 260,
          height: 260,
          borderRadius: 56,
          background: palette.white,
          border: `8px solid ${palette.ink}`,
          boxShadow: `14px 14px 0 ${palette.accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoIn}) rotate(${interpolate(logoIn, [0, 1], [-15, 0])}deg)`,
          opacity: logoIn,
          overflow: "hidden",
        }}
      >
        <img src={staticFile("logo.png")} style={{ width: 200, height: 200, objectFit: "contain" }} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 700,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          color: palette.yellow,
          fontSize: 130,
          letterSpacing: -3,
          lineHeight: 1.0,
          opacity: word1,
          transform: `translateY(${interpolate(word1, [0, 1], [40, 0])}px)`,
        }}
      >
        Alerta
      </div>
      <div
        style={{
          position: "absolute",
          top: 840,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          color: palette.white,
          fontSize: 130,
          letterSpacing: -3,
          lineHeight: 1.0,
          opacity: word2,
          transform: `translateY(${interpolate(word2, [0, 1], [40, 0])}px)`,
        }}
      >
        Medicina
      </div>

      <div
        style={{
          position: "absolute",
          top: 1080,
          left: 60,
          right: 60,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 56,
          color: "#E8F5EE",
          letterSpacing: -1,
          lineHeight: 1.15,
          opacity: tag,
          transform: `translateY(${interpolate(tag, [0, 1], [20, 0])}px)`,
        }}
      >
        Lo que sea de tu medicina,
        <br />
        <span style={{ color: palette.yellow }}>lo resolvemos.</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 44,
          color: palette.white,
          letterSpacing: 0.5,
          opacity: url,
          padding: "16px 0",
          background: `rgba(8,51,42,${0.4 * url})`,
        }}
      >
        alertamedicina.com
      </div>
    </AbsoluteFill>
  );
};