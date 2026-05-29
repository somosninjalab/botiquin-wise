import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, KenBurnsImg, SceneFade, Vignette, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const P1Headache: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const t2 = spring({ frame: frame - 24, fps, config: { damping: 11, stiffness: 220 } });
  const pulse = 1 + Math.sin(frame / 4) * 0.04;
  return (
    <SceneFade>
      <AbsoluteFill>
        <BrandBackdrop tone="warm" />
        <AbsoluteFill style={{ width: 980, height: 1380, left: 50, top: 320, borderRadius: 48, overflow: "hidden", border: `8px solid ${palette.ink}`, boxShadow: `20px 20px 0 ${palette.accent}` }}>
          <KenBurnsImg src={staticFile("people/headache.jpg")} zoomFrom={1.05} zoomTo={1.18} />
          <Vignette strength={0.45} />
        </AbsoluteFill>
        {/* Pulsing pain rings near temples */}
        {[0, 1, 2].map((i) => {
          const r = (frame * 4 + i * 30) % 120;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 360,
                top: 760,
                width: 100 + r,
                height: 100 + r,
                marginLeft: -(50 + r / 2),
                marginTop: -(50 + r / 2),
                borderRadius: "50%",
                border: `4px solid ${palette.accent}`,
                opacity: interpolate(r, [0, 120], [0.6, 0]),
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            top: 110,
            left: 70,
            right: 70,
            fontFamily: display,
            fontWeight: 700,
            color: palette.ink,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 64, letterSpacing: -1.5, lineHeight: 1.0 }}>Otra vez,</div>
          <div
            style={{
              fontSize: 150,
              letterSpacing: -5,
              lineHeight: 0.95,
              color: palette.accent,
              textShadow: `8px 8px 0 ${palette.ink}`,
              transform: `scale(${t2 * pulse}) rotate(-3deg)`,
              transformOrigin: "left center",
              marginTop: 4,
            }}
          >
            duele.
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};