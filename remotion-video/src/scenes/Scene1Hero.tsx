import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";
import { COLORS, PHARMACIES } from "../theme";

export const Scene1Hero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const subOp = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [12, 30], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center", maxWidth: 1400 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            background: COLORS.card,
            border: `2px solid ${COLORS.border}`,
            padding: "10px 22px",
            borderRadius: 999,
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.primary,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [0, 18], [-20, 0], { extrapolateRight: "clamp" })}px)`,
            marginBottom: 36,
            boxShadow: "0 8px 24px -10px rgba(22,163,122,0.25)",
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: COLORS.primary }} />
          ALERTA MEDICINA
        </div>

        <h1
          style={{
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1.02,
            margin: 0,
            color: COLORS.ink,
            letterSpacing: -4,
            transform: `translateY(${interpolate(titleY, [0, 1], [60, 0])}px) scale(${interpolate(titleY, [0, 1], [0.92, 1])})`,
            opacity: titleY,
          }}
        >
          Compara precios{" "}
          <span style={{ background: "linear-gradient(135deg,#16A37A,#3FD3A2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            en segundos
          </span>
        </h1>

        <div
          style={{
            marginTop: 32,
            fontSize: 38,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: subOp,
            transform: `translateY(${subY}px)`,
          }}
        >
          5 farmacias de Venezuela, un solo vistazo
        </div>

        <div style={{ display: "flex", gap: 28, justifyContent: "center", marginTop: 60 }}>
          {PHARMACIES.map((p, i) => {
            const d = 35 + i * 5;
            const s = spring({ frame: frame - d, fps, config: { damping: 14, stiffness: 180 } });
            return (
              <div
                key={p.slug}
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: "#fff",
                  border: `3px solid ${COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 12px 30px -10px rgba(15,42,46,0.18)",
                  transform: `scale(${s})`,
                  opacity: s,
                }}
              >
                <Img src={staticFile(`logos/${p.slug}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};