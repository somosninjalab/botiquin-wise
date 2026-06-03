import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const AboutThanks = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heartS = spring({ frame, fps, config: { damping: 10, stiffness: 180 } });
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 16 } });
  const subS = spring({ frame: frame - 28, fps, config: { damping: 18 } });
  const beat = 1 + Math.sin(frame / 4) * 0.08;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E5F5EE 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 920 }}>
        <div
          style={{
            width: 200,
            height: 200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${heartS * beat})`,
            opacity: heartS,
          }}
        >
          <svg width="180" height="180" viewBox="0 0 24 24" fill={COLORS.primary}>
            <path d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.5 5 6.5 5c2.3 0 3.9 1.2 5.5 3 1.6-1.8 3.2-3 5.5-3 4 0 5.7 4.6 4 7.5C19 16.65 12 21 12 21z" />
          </svg>
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 88,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.05,
            letterSpacing: -2,
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Gracias.
          <br />
          Y esto <span style={{ color: COLORS.primary }}>apenas empieza.</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.muted,
            opacity: subS,
          }}
        >
          Por confiar en nosotros.
        </div>
      </div>
    </AbsoluteFill>
  );
};