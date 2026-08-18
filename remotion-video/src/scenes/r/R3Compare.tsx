import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, PHARMACIES } from "../../theme";

export const R3Compare = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 20%, ${COLORS.primaryGlow}26 0%, ${COLORS.bg} 60%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
        flexDirection: "column",
        gap: 36,
      }}
    >
      <div
        style={{
          fontSize: 46,
          fontWeight: 900,
          color: COLORS.muted,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: head,
        }}
      >
        Una búsqueda, todos los precios
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 920 }}>
        {PHARMACIES.map((p, i) => {
          const s = spring({ frame: frame - 10 - i * 9, fps, config: { damping: 16, stiffness: 150 } });
          const best = "best" in p && p.best;
          const glow = best ? 1 + Math.sin(Math.max(0, frame - 60) / 7) * 0.02 : 1;
          return (
            <div
              key={p.slug}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: best ? COLORS.primary : "#fff",
                border: `2px solid ${best ? COLORS.primary : COLORS.border}`,
                borderRadius: 26,
                padding: "26px 34px",
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${glow})`,
                boxShadow: best
                  ? "0 28px 60px -26px rgba(22,163,122,0.6)"
                  : "0 18px 40px -32px rgba(15,42,46,0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: best ? "#fff" : p.color }} />
                <div style={{ fontSize: 42, fontWeight: 800, color: best ? "#fff" : COLORS.ink }}>{p.name}</div>
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: best ? "#fff" : COLORS.muted, letterSpacing: -1 }}>
                {p.price}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
