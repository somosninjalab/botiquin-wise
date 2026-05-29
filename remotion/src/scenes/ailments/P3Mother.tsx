import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, KenBurnsImg, SceneFade, Vignette, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const P3Mother: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const t2 = spring({ frame: frame - 22, fps, config: { damping: 11, stiffness: 220 } });
  return (
    <SceneFade>
      <AbsoluteFill>
        <BrandBackdrop tone="warm" />
        <AbsoluteFill style={{ width: 940, height: 1340, left: 70, top: 400, borderRadius: 48, overflow: "hidden", border: `8px solid ${palette.ink}`, boxShadow: `18px 18px 0 ${palette.yellow}` }}>
          <KenBurnsImg src={staticFile("people/mother.jpg")} zoomFrom={1.04} zoomTo={1.16} />
          <Vignette strength={0.5} />
        </AbsoluteFill>
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
          <div style={{ fontSize: 60, lineHeight: 1.0, letterSpacing: -1.5 }}>El precio sube</div>
          <div
            style={{
              fontSize: 132,
              lineHeight: 0.95,
              letterSpacing: -4,
              color: palette.accent,
              textShadow: `8px 8px 0 ${palette.ink}`,
              transform: `scale(${t2}) rotate(-2deg)`,
              transformOrigin: "left center",
              marginTop: 8,
            }}
          >
            cada semana.
          </div>
        </div>
        {/* upward arrow trending */}
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 220,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 180,
            color: palette.accent,
            transform: `rotate(${interpolate(frame, [20, 60], [0, -10])}deg) translateY(${interpolate(frame, [20, 60], [40, -10])}px)`,
            opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }),
            textShadow: `6px 6px 0 ${palette.ink}`,
          }}
        >
          ↑
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};