import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

export const Scene6CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bellS = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const ring = Math.sin(frame / 3) * interpolate(frame, [10, 30, 50], [0, 12, 6], { extrapolateRight: "clamp" });
  const titleS = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const urlS = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 140 } });
  const subS = spring({ frame: frame - 50, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E5F5EE 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 940 }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: COLORS.accent,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 60px -20px rgba(240,138,75,0.5)",
            transform: `scale(${bellS}) rotate(${ring}deg)`,
            opacity: bellS,
          }}
        >
          <svg width="120" height="120" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 96,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.05,
            letterSpacing: -2,
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Y te avisamos
          <br />
          cuando <span style={{ color: COLORS.primary }}>baje</span>.
        </div>

        <div
          style={{
            marginTop: 70,
            display: "inline-block",
            background: COLORS.ink,
            color: "#fff",
            fontSize: 56,
            fontWeight: 900,
            padding: "26px 50px",
            borderRadius: 999,
            letterSpacing: -1,
            opacity: urlS,
            transform: `scale(${urlS})`,
            boxShadow: "0 20px 50px -20px rgba(15,42,46,0.5)",
          }}
        >
          alertamedicina.com
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.muted,
            opacity: subS,
          }}
        >
          Gratis · Sin registro · En segundos
        </div>
      </div>
    </AbsoluteFill>
  );
};