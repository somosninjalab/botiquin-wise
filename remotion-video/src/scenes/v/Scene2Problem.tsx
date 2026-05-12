import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PHARMACIES } from "../../theme";

export const Scene2Problem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  // Same medicine, wildly different prices
  const items = [
    { ...PHARMACIES[0] }, // Farmatodo Bs. 240
    { ...PHARMACIES[2] }, // SAAS Bs. 96
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        flexDirection: "column",
        gap: 50,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: COLORS.ink,
          textAlign: "center",
          opacity: headerS,
          transform: `translateY(${interpolate(headerS, [0, 1], [-20, 0])}px)`,
          maxWidth: 900,
          lineHeight: 1.1,
        }}
      >
        La <span style={{ color: COLORS.primary }}>misma</span> medicina,
        <br />precios muy distintos.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: "100%", maxWidth: 920 }}>
        {items.map((p, i) => {
          const d = 12 + i * 14;
          const s = spring({ frame: frame - d, fps, config: { damping: 16, stiffness: 160 } });
          return (
            <div
              key={p.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 30,
                background: COLORS.card,
                borderRadius: 28,
                padding: "32px 40px",
                border: `3px solid ${COLORS.border}`,
                boxShadow: "0 14px 40px -16px rgba(15,42,46,0.18)",
                transform: `translateX(${interpolate(s, [0, 1], [i % 2 === 0 ? -120 : 120, 0])}px)`,
                opacity: s,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: "#fff",
                  border: `3px solid ${COLORS.border}`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Img src={staticFile(`logos/${p.slug}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 52, fontWeight: 800, color: COLORS.ink, flex: 1 }}>{p.name}</div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: i === 0 ? COLORS.accent : COLORS.primary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {p.price}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.accent,
          textAlign: "center",
          opacity: spring({ frame: frame - 60, fps, config: { damping: 14 } }),
          transform: `scale(${spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 200 } })})`,
        }}
      >
        2,5× más caro.
      </div>
    </AbsoluteFill>
  );
};