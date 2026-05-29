import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, KenBurnsImg, Vignette, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const S3Alert: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgIn = spring({ frame, fps, config: { damping: 18 } });
  const notif = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 200 } });
  const text = spring({ frame: frame - 26, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill>
      <BrandBackdrop tone="warm" />
      <AbsoluteFill style={{ opacity: bgIn * 0.55 }}>
        <KenBurnsImg src={staticFile("people/happy-phone.jpg")} zoomFrom={1.0} zoomTo={1.1} />
        <Vignette strength={0.35} />
      </AbsoluteFill>

      {/* Phone notification card */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 380,
          background: palette.white,
          border: `6px solid ${palette.ink}`,
          borderRadius: 32,
          padding: "32px 36px",
          boxShadow: `14px 14px 0 ${palette.accent}`,
          transform: `translateY(${interpolate(notif, [0, 1], [-120, 0])}px) rotate(${interpolate(notif, [0, 1], [-4, -1.5])}deg)`,
          opacity: notif,
          display: "flex",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: palette.primary,
            border: `4px solid ${palette.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img src={staticFile("logo.png")} style={{ width: 76, height: 76, objectFit: "contain" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: display, fontSize: 30, fontWeight: 700, color: palette.inkSoft, letterSpacing: 0.5 }}>
            Alerta Medicina
          </div>
          <div style={{ fontFamily: display, fontSize: 44, fontWeight: 700, color: palette.ink, lineHeight: 1.1, marginTop: 6 }}>
            ¡Bajó el precio cerca de ti!
          </div>
          <div style={{ fontFamily: display, fontSize: 36, fontWeight: 700, color: palette.primary, marginTop: 6 }}>
            −53% · SAAS
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 220,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 96,
          color: palette.ink,
          letterSpacing: -2.5,
          lineHeight: 1.0,
          opacity: text,
          transform: `translateY(${interpolate(text, [0, 1], [30, 0])}px)`,
        }}
      >
        <div>Te avisamos</div>
        <div style={{ color: palette.accent, textShadow: `6px 6px 0 ${palette.ink}` }}>cuando importa.</div>
      </div>
    </AbsoluteFill>
  );
};