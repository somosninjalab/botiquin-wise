import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// Three big benefits stagger in
export const ExScene4Benefit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);

  const items = [
    { icon: "✓", title: "Gratis", sub: "Siempre. Sin trucos.", delay: 20, c: palette.primary },
    { icon: "⚡", title: "Al instante", sub: "Precios al día, en segundos.", delay: 45, c: palette.accent },
    { icon: "🔔", title: "Te avisamos", sub: "Cuando una medicina baja.", delay: 70, c: palette.yellow },
  ];

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.primary} x={-100} y={-100} size={420} />
      <FloatingBlob color={palette.accent} x={780} y={1500} size={520} phase={15} />
      <Grain />

      <AbsoluteFill style={{ padding: "200px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.02,
            letterSpacing: -2,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          Antes de <br />
          <span style={{ color: palette.primaryDeep }}>comprar</span> <br />
          medicinas…
        </div>

        <div style={{ marginTop: 80, display: "flex", flexDirection: "column", gap: 32 }}>
          {items.map((it, i) => {
            const local = Math.max(0, frame - it.delay);
            const inSp = spring({ frame: local, fps, config: { damping: 14, stiffness: 130 } });
            const x = interpolate(inSp, [0, 1], [-500, 0]);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  transform: `translateX(${x}px)`,
                  opacity: inSp,
                }}
              >
                <div
                  style={{
                    width: 110,
                    height: 110,
                    borderRadius: 24,
                    background: it.c,
                    border: `4px solid ${palette.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 60,
                    color: palette.ink,
                    boxShadow: "6px 6px 0 #0B1B2B",
                    flexShrink: 0,
                  }}
                >
                  {it.icon}
                </div>
                <div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 64, lineHeight: 1, color: palette.ink }}>
                    {it.title}
                  </div>
                  <div style={{ fontFamily: body, fontSize: 30, color: palette.inkSoft, marginTop: 6 }}>
                    {it.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};