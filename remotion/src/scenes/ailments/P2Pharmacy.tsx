import { staticFile } from "remotion";
import { AbsoluteFill, BrandBackdrop, KenBurnsImg, SceneFade, Vignette, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

export const P2Pharmacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t1 = spring({ frame, fps, config: { damping: 14 } });
  const t2 = spring({ frame: frame - 18, fps, config: { damping: 10, stiffness: 240 } });
  const shake = Math.sin(frame / 2) * (frame > 40 ? 6 : 0);
  // Floating price tags
  const tags = [
    { x: 90, y: 420, price: "Bs. 240", rot: -8, delay: 24, color: "#D9532A" },
    { x: 740, y: 540, price: "Bs. 198", rot: 10, delay: 36, color: palette.accent },
    { x: 120, y: 1100, price: "Bs. 215", rot: -6, delay: 48, color: "#D9532A" },
  ];
  return (
    <SceneFade>
      <AbsoluteFill>
        <BrandBackdrop tone="warm" />
        <AbsoluteFill style={{ width: 880, height: 1280, left: 100, top: 420, borderRadius: 48, overflow: "hidden", border: `8px solid ${palette.ink}`, boxShadow: `-18px 18px 0 ${palette.primary}` }}>
          <KenBurnsImg src={staticFile("people/tired-man.jpg")} zoomFrom={1.08} zoomTo={1.18} panX={-30} />
          <Vignette strength={0.5} />
        </AbsoluteFill>
        {tags.map((tag, i) => {
          const s = spring({ frame: frame - tag.delay, fps, config: { damping: 9, stiffness: 220 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: tag.x,
                top: tag.y + Math.sin((frame + i * 12) / 10) * 8,
                padding: "22px 36px",
                background: palette.white,
                border: `5px solid ${palette.ink}`,
                borderRadius: 18,
                boxShadow: `8px 8px 0 ${tag.color}`,
                transform: `scale(${s}) rotate(${interpolate(s, [0, 1], [-20, tag.rot])}deg)`,
                opacity: s,
                fontFamily: display,
                fontWeight: 700,
                fontSize: 56,
                color: palette.ink,
              }}
            >
              {tag.price}
            </div>
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
            transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px) translateX(${shake}px)`,
          }}
        >
          <div style={{ fontSize: 64, lineHeight: 1.0, letterSpacing: -1.5 }}>Cinco farmacias,</div>
          <div
            style={{
              fontSize: 130,
              lineHeight: 0.95,
              letterSpacing: -4,
              color: palette.accent,
              textShadow: `8px 8px 0 ${palette.ink}`,
              transform: `scale(${t2})`,
              transformOrigin: "left center",
              marginTop: 8,
            }}
          >
            cinco precios.
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};