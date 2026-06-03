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
            fontSize: 180,
            lineHeight: 1,
            transform: `scale(${heartS * beat})`,
            opacity: heartS,
          }}
        >
          💚
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