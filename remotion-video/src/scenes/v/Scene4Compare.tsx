import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, PHARMACIES } from "../../theme";

export const Scene4Compare = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });

  // Search bar typing effect
  const fullText = "Acetaminofén 500 mg";
  const charsShown = Math.min(fullText.length, Math.max(0, frame - 10));
  const typed = fullText.slice(0, charsShown);
  const caret = frame % 20 < 10 ? "|" : " ";

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        alignItems: "center",
        padding: 60,
        flexDirection: "column",
        gap: 36,
        paddingTop: 140,
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: COLORS.primary,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: headerS,
        }}
      >
        Buscas una vez
      </div>

      {/* Search bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 940,
          background: COLORS.card,
          borderRadius: 28,
          padding: "30px 36px",
          border: `3px solid ${COLORS.primary}`,
          boxShadow: "0 18px 50px -20px rgba(22,163,122,0.4)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: spring({ frame: frame - 4, fps, config: { damping: 16 } }),
          transform: `translateY(${interpolate(spring({ frame: frame - 4, fps, config: { damping: 16 } }), [0, 1], [30, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 50 }}>🔍</div>
        <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.ink, fontFamily: "monospace" }}>
          {typed}
          <span style={{ color: COLORS.primary }}>{caret}</span>
        </div>
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: COLORS.accent,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginTop: 20,
          opacity: spring({ frame: frame - 35, fps, config: { damping: 18 } }),
        }}
      >
        ↓ 5 farmacias al instante
      </div>

      {/* Pharmacy list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 940 }}>
        {PHARMACIES.map((p, i) => {
          const d = 40 + i * 7;
          const s = spring({ frame: frame - d, fps, config: { damping: 16, stiffness: 170 } });
          const isBest = p.best;
          const highlight = interpolate(frame, [95, 115], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={p.slug}
              style={{
                display: "flex",
                alignItems: "center",
                background: COLORS.card,
                borderRadius: 22,
                padding: "20px 28px",
                border: `3px solid ${isBest ? `rgba(22,163,122,${0.2 + highlight * 0.8})` : COLORS.border}`,
                boxShadow: isBest
                  ? `0 ${10 + highlight * 18}px ${30 + highlight * 30}px -10px rgba(22,163,122,${0.2 + highlight * 0.4})`
                  : "0 6px 20px -10px rgba(15,42,46,0.10)",
                transform: `translateX(${interpolate(s, [0, 1], [-100, 0])}px) scale(${isBest ? 1 + highlight * 0.04 : 1})`,
                opacity: s,
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: "#fff",
                  border: `2px solid ${COLORS.border}`,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Img src={staticFile(`logos/${p.slug}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, flex: 1 }}>{p.name}</div>
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  color: isBest ? COLORS.primary : COLORS.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {p.price}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};