import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { display, body, palette } from "../../theme";

// Brand reveal + value prop
export const PainScene4Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drift = Math.sin(frame / 30) * 30;

  const logoIn = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
  const wordIn = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 40, fps, config: { damping: 16 } });

  const checks = [
    { label: "Compara TODAS las farmacias", delay: 60 },
    { label: "Encuentra el mejor precio", delay: 76 },
    { label: "Te avisa si baja el precio", delay: 92 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% 30%, ${palette.primary} 0%, ${palette.primaryDeep} 55%, #08332A 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -120,
          bottom: -120,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: palette.accent,
          filter: "blur(60px)",
          opacity: 0.35,
        }}
      />

      <AbsoluteFill style={{ padding: "200px 70px 0", alignItems: "flex-start" }}>
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: 36,
            background: palette.white,
            border: `6px solid ${palette.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "10px 10px 0 #08332A",
            transform: `scale(${logoIn}) rotate(${interpolate(logoIn, [0, 1], [-15, 0])}deg)`,
            opacity: logoIn,
            overflow: "hidden",
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: 160, height: 160, objectFit: "contain" }} />
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.0,
            color: palette.yellow,
            letterSpacing: -2,
            transform: `translateY(${interpolate(wordIn, [0, 1], [40, 0])}px)`,
            opacity: wordIn,
          }}
        >
          Alerta
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.0,
            color: palette.white,
            letterSpacing: -2,
            transform: `translateY(${interpolate(wordIn, [0, 1], [40, 0])}px)`,
            opacity: wordIn,
          }}
        >
          Medicina
        </div>

        <div
          style={{
            marginTop: 30,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 36,
            color: "#E8F5EE",
            opacity: subIn,
            maxWidth: 820,
            lineHeight: 1.25,
          }}
        >
          busca por ti en todas las farmacias.
        </div>

        <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 18 }}>
          {checks.map((c, i) => {
            const s = spring({ frame: frame - c.delay, fps, config: { damping: 11, stiffness: 200 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`,
                  opacity: s,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: palette.yellow,
                    border: `4px solid ${palette.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 38,
                    color: palette.ink,
                  }}
                >
                  ✓
                </div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 40,
                    color: palette.white,
                    letterSpacing: -0.5,
                  }}
                >
                  {c.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};