import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PHARMACIES } from "../../theme";

export const Scene5Winner = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const winner = PHARMACIES.find((p) => p.best)!;

  const cardS = spring({ frame, fps, config: { damping: 12, stiffness: 130 } });
  const priceS = spring({ frame: frame - 18, fps, config: { damping: 10, stiffness: 160 } });
  const saveS = spring({ frame: frame - 38, fps, config: { damping: 14 } });
  const confettiOp = interpolate(frame, [20, 40, 90, 110], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, ${COLORS.primaryGlow}33 0%, ${COLORS.bg} 65%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      {/* Confetti dots */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = (i * 137) % 1080;
        const y = ((i * 73) % 600) + interpolate(frame - 20 - (i % 6) * 3, [0, 120], [0, 800], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const colors = [COLORS.primary, COLORS.primaryGlow, COLORS.accent, "#F0D08A"];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 14,
              height: 14,
              borderRadius: 4,
              background: colors[i % 4],
              opacity: confettiOp,
              transform: `rotate(${(frame * 6 + i * 30) % 360}deg)`,
            }}
          />
        );
      })}

      <div
        style={{
          width: "92%",
          maxWidth: 920,
          background: COLORS.card,
          borderRadius: 40,
          padding: 60,
          border: `5px solid ${COLORS.primary}`,
          boxShadow: "0 40px 80px -30px rgba(22,163,122,0.5)",
          textAlign: "center",
          transform: `scale(${cardS})`,
          opacity: cardS,
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: COLORS.primary,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          🏆 Mejor precio
        </div>

        <div
          style={{
            margin: "40px auto",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "#fff",
            border: `5px solid ${COLORS.primary}`,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img src={staticFile(`logos/${winner.slug}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.ink }}>{winner.name}</div>

        <div
          style={{
            marginTop: 24,
            fontSize: 180,
            fontWeight: 900,
            color: COLORS.primary,
            letterSpacing: -6,
            lineHeight: 1,
            transform: `scale(${priceS})`,
            opacity: priceS,
          }}
        >
          {winner.price}
        </div>

        <div
          style={{
            marginTop: 30,
            display: "inline-block",
            background: COLORS.accent,
            color: "#fff",
            fontSize: 44,
            fontWeight: 900,
            padding: "16px 32px",
            borderRadius: 999,
            opacity: saveS,
            transform: `scale(${saveS})`,
          }}
        >
          Ahorras 60% 💸
        </div>
      </div>
    </AbsoluteFill>
  );
};