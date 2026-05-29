import { AbsoluteFill, BrandBackdrop, display, interpolate, palette, spring, useCurrentFrame, useVideoConfig } from "./_shared";

const ROWS = [
  { name: "Farmatodo", price: "Bs. 240", color: "#E30613", best: false },
  { name: "Locatel", price: "Bs. 198", color: "#0066B3", best: false },
  { name: "SAAS", price: "Bs. 96", color: palette.primary, best: true },
  { name: "Farmago", price: "Bs. 215", color: "#00A99D", best: false },
];

export const S2Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <BrandBackdrop tone="cool" />
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 70,
          right: 70,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 80,
          color: palette.ink,
          letterSpacing: -2,
          lineHeight: 1.0,
          opacity: head,
          transform: `translateY(${interpolate(head, [0, 1], [40, 0])}px)`,
        }}
      >
        Una sola búsqueda.
        <div style={{ color: palette.accent, fontSize: 96, textShadow: `6px 6px 0 ${palette.ink}` }}>
          El mejor precio.
        </div>
      </div>
      <div style={{ position: "absolute", top: 540, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 18 }}>
        {ROWS.map((r, i) => {
          const d = 8 + i * 8;
          const s = spring({ frame: frame - d, fps, config: { damping: 12, stiffness: 220 } });
          const fade = r.best ? 1 : interpolate(frame, [44, 56], [1, 0.28], { extrapolateRight: "clamp" });
          const scl = r.best ? 1 + interpolate(frame, [44, 60], [0, 0.08], { extrapolateRight: "clamp" }) : 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "22px 32px",
                background: palette.white,
                border: `5px solid ${palette.ink}`,
                borderRadius: 22,
                boxShadow: r.best ? `10px 10px 0 ${palette.primary}` : `6px 6px 0 ${palette.ink}`,
                transform: `translateX(${interpolate(s, [0, 1], [-200, 0])}px) scale(${scl})`,
                opacity: s * fade,
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: r.color, border: `3px solid ${palette.ink}` }} />
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 44, color: palette.ink, flex: 1 }}>{r.name}</div>
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 48, color: r.best ? palette.primary : palette.ink }}>{r.price}</div>
              {r.best && (
                <div
                  style={{
                    position: "absolute",
                    right: -20,
                    top: -28,
                    padding: "8px 18px",
                    background: palette.yellow,
                    border: `4px solid ${palette.ink}`,
                    borderRadius: 12,
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 28,
                    color: palette.ink,
                    transform: "rotate(6deg)",
                  }}
                >
                  ¡EL MEJOR!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};