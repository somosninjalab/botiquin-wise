import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const S1Find: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 11, stiffness: 220 } });
  const t2 = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const t3 = spring({ frame: frame - 28, fps, config: { damping: 10, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <BrandBackdrop tone="deep" />
      {/* Big pill icon */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 540,
          width: 360,
          height: 200,
          marginLeft: -180,
          borderRadius: 100,
          background: `linear-gradient(90deg, ${palette.white} 0%, ${palette.white} 50%, ${palette.yellow} 50%, ${palette.yellow} 100%)`,
          border: `8px solid ${palette.ink}`,
          transform: `scale(${t1}) rotate(${interpolate(t1, [0, 1], [-90, -15])}deg)`,
          boxShadow: `14px 14px 0 ${palette.ink}`,
        }}
      />
      {/* Logo chip */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 260,
          width: 180,
          height: 180,
          marginLeft: -90,
          borderRadius: 36,
          background: palette.white,
          border: `6px solid ${palette.ink}`,
          boxShadow: `10px 10px 0 ${palette.accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${t2}) rotate(${interpolate(t2, [0, 1], [-20, 0])}deg)`,
          overflow: "hidden",
        }}
      >
        <img src={staticFile("logo.png")} style={{ width: 140, height: 140, objectFit: "contain" }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 880,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          color: palette.white,
          fontSize: 110,
          letterSpacing: -3,
          lineHeight: 1.0,
          opacity: t3,
          transform: `translateY(${interpolate(t3, [0, 1], [40, 0])}px)`,
        }}
      >
        Lo resolvemos.
      </div>
      <div
        style={{
          position: "absolute",
          top: 1040,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 64,
          color: palette.yellow,
          letterSpacing: -1.5,
          opacity: interpolate(frame, [34, 50], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        con Alerta Medicina.
      </div>
    </AbsoluteFill>
  );
};