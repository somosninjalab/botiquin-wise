import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { COLORS, PHARMACIES } from "../theme";

export const Scene2Compare = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ width: "100%", maxWidth: 1300 }}>
        <div
          style={{
            textAlign: "center",
            marginBottom: 50,
            opacity: headerS,
            transform: `translateY(${interpolate(headerS, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.primary, letterSpacing: 2, textTransform: "uppercase" }}>
            Buscando “Acetaminofén 500 mg”
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, color: COLORS.ink, marginTop: 8, letterSpacing: -2 }}>
            Comparando 5 farmacias
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {PHARMACIES.map((p, i) => {
            const d = 8 + i * 8;
            const s = spring({ frame: frame - d, fps, config: { damping: 16, stiffness: 160 } });
            const isBest = p.best;
            const highlight = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={p.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: COLORS.card,
                  borderRadius: 22,
                  padding: "22px 36px",
                  border: `3px solid ${isBest ? `rgba(22,163,122,${0.2 + highlight * 0.8})` : COLORS.border}`,
                  boxShadow: isBest
                    ? `0 ${10 + highlight * 20}px ${30 + highlight * 30}px -10px rgba(22,163,122,${0.2 + highlight * 0.4})`
                    : "0 6px 20px -10px rgba(15,42,46,0.12)",
                  transform: `translateX(${interpolate(s, [0, 1], [-80, 0])}px) scale(${isBest ? 1 + highlight * 0.04 : 1})`,
                  opacity: s,
                  gap: 24,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "#fff",
                    border: `2px solid ${COLORS.border}`,
                    flexShrink: 0,
                  }}
                >
                  <Img src={staticFile(`logos/${p.slug}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ fontSize: 44, fontWeight: 800, color: COLORS.ink, flex: 1 }}>{p.name}</div>
                {isBest && (
                  <div
                    style={{
                      background: COLORS.primary,
                      color: "#fff",
                      fontSize: 20,
                      fontWeight: 800,
                      padding: "8px 16px",
                      borderRadius: 999,
                      letterSpacing: 1,
                      opacity: highlight,
                    }}
                  >
                    MEJOR PRECIO
                  </div>
                )}
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: isBest ? COLORS.primary : COLORS.ink,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 240,
                    textAlign: "right",
                  }}
                >
                  {p.price}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};