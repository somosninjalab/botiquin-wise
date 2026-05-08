import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { COLORS } from "../theme";

export const Scene3Winner = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardS = spring({ frame, fps, config: { damping: 12, stiffness: 140 } });
  const savings = Math.round(interpolate(frame, [15, 60], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bellOp = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" });
  const bellRing = Math.sin((frame - 55) / 2) * (frame > 55 ? 8 : 0);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ width: "100%", maxWidth: 1100, textAlign: "center" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 36,
            border: `5px solid ${COLORS.primary}`,
            padding: "60px 70px",
            boxShadow: "0 30px 80px -30px rgba(22,163,122,0.5)",
            transform: `scale(${cardS})`,
            opacity: cardS,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 32 }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#fff",
                border: `4px solid ${COLORS.primary}`,
              }}
            >
              <Img src={staticFile("logos/saas.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: COLORS.ink, lineHeight: 1, letterSpacing: -2 }}>SAAS</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary, marginTop: 8, letterSpacing: 1 }}>
                ✓ MEJOR PRECIO HOY
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 200,
              fontWeight: 900,
              color: COLORS.primary,
              lineHeight: 1,
              letterSpacing: -8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Bs. 96
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 44,
              fontWeight: 800,
              color: COLORS.accent,
            }}
          >
            ↓ Ahorras {savings}%
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            display: "inline-flex",
            alignItems: "center",
            gap: 18,
            background: COLORS.card,
            border: `3px solid ${COLORS.accent}`,
            padding: "20px 40px",
            borderRadius: 999,
            fontSize: 38,
            fontWeight: 800,
            color: COLORS.ink,
            opacity: bellOp,
            transform: `translateY(${interpolate(bellOp, [0, 1], [20, 0])}px)`,
            boxShadow: "0 14px 30px -12px rgba(240,138,75,0.4)",
          }}
        >
          <span style={{ display: "inline-block", transform: `rotate(${bellRing}deg)`, fontSize: 44 }}>🔔</span>
          Te avisamos cuando baje el precio
        </div>

        <div style={{ marginTop: 40, fontSize: 28, fontWeight: 700, color: COLORS.muted, letterSpacing: 4 }}>
          ALERTAMEDICINA.COM
        </div>
      </div>
    </AbsoluteFill>
  );
};