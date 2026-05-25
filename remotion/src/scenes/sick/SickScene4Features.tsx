import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// What does it do — features grid
export const SickScene4Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);

  const features = [
    {
      icon: "🔍",
      title: "Busca tu medicina",
      sub: "Por nombre o principio activo.",
      delay: 22,
      c: palette.primary,
    },
    {
      icon: "⚖️",
      title: "Compara precios",
      sub: "En todas las farmacias.",
      delay: 42,
      c: palette.accent,
    },
    {
      icon: "🔔",
      title: "Alertas de bajada",
      sub: "Te avisamos cuando baja.",
      delay: 62,
      c: palette.yellow,
    },
    {
      icon: "💰",
      title: "Ahorra hasta 60%",
      sub: "En la misma medicina.",
      delay: 82,
      c: palette.primaryDeep,
    },
  ];

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.primary} x={-120} y={-100} size={420} />
      <FloatingBlob color={palette.accent} x={780} y={1500} size={520} phase={20} />
      <Grain />

      <AbsoluteFill style={{ padding: "180px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 86,
            lineHeight: 1.02,
            letterSpacing: -2,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          Esto es lo <br />
          que <span style={{ color: palette.primary }}>hace</span> por ti:
        </div>

        <div
          style={{
            marginTop: 70,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
          }}
        >
          {features.map((f, i) => {
            const local = Math.max(0, frame - f.delay);
            const inSp = spring({ frame: local, fps, config: { damping: 14, stiffness: 140 } });
            const y = interpolate(inSp, [0, 1], [80, 0]);
            return (
              <div
                key={i}
                style={{
                  background: palette.white,
                  border: `4px solid ${palette.ink}`,
                  borderRadius: 24,
                  padding: "26px 22px",
                  boxShadow: "8px 8px 0 #0B1B2B",
                  transform: `translateY(${y}px)`,
                  opacity: inSp,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  minHeight: 320,
                }}
              >
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 20,
                    background: f.c,
                    border: `4px solid ${palette.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 50,
                  }}
                >
                  {f.icon}
                </div>
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: 36, lineHeight: 1.05, color: palette.ink }}>
                  {f.title}
                </div>
                <div style={{ fontFamily: body, fontSize: 26, color: palette.inkSoft, lineHeight: 1.25 }}>
                  {f.sub}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 50,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 44,
            color: palette.accent,
            textAlign: "center",
            opacity: spring({ frame: frame - 110, fps, config: { damping: 14 } }),
          }}
        >
          Y todo… <span style={{ color: palette.primaryDeep }}>gratis.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};