import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../../theme";

const STATS = [
  { value: 9000, label: "personas comparando", suffix: "+", color: COLORS.primary },
  { value: 25000, label: "medicinas buscadas", suffix: "+", color: COLORS.accent },
  { value: 2000, label: "alertas activas", suffix: "+", color: COLORS.ink },
];

const formatNumber = (n: number) => {
  return Math.round(n).toLocaleString("es-VE");
};

export const SceneMilestones = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const subS = spring({ frame: frame - 14, fps, config: { damping: 18 } });

  // confetti-ish floating dots in the background
  const dots = Array.from({ length: 14 });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${COLORS.primaryGlow}33 0%, ${COLORS.bg} 65%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
        flexDirection: "column",
        gap: 40,
        overflow: "hidden",
      }}
    >
      {dots.map((_, i) => {
        const seed = i * 37.3;
        const t = frame / 30;
        const x = (i * 91) % 1000 + 40 + Math.sin(t + seed) * 20;
        const y = (i * 173) % 1700 + 80 + Math.cos(t * 0.8 + seed) * 24;
        const size = 14 + (i % 4) * 6;
        const isAccent = i % 2 === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: isAccent ? COLORS.accent : COLORS.primary,
              opacity: 0.35,
            }}
          />
        );
      })}

      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: COLORS.accent,
          letterSpacing: 4,
          textTransform: "uppercase",
          opacity: headerS,
          transform: `translateY(${interpolate(headerS, [0, 1], [-20, 0])}px)`,
        }}
      >
        Ya somos comunidad
      </div>

      <div
        style={{
          fontSize: 84,
          fontWeight: 900,
          color: COLORS.ink,
          letterSpacing: -2,
          lineHeight: 1.0,
          textAlign: "center",
          opacity: subS,
          transform: `translateY(${interpolate(subS, [0, 1], [20, 0])}px)`,
        }}
      >
        Gracias por
        <br />
        <span style={{ color: COLORS.primary }}>cuidar tu bolsillo.</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          width: "100%",
          maxWidth: 900,
          marginTop: 20,
        }}
      >
        {STATS.map((stat, i) => {
          const startF = 38 + i * 22;
          const enter = spring({ frame: frame - startF, fps, config: { damping: 14, stiffness: 140 } });
          const countT = interpolate(frame, [startF + 4, startF + 44], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          // ease-out
          const eased = 1 - Math.pow(1 - countT, 3);
          const displayed = stat.value * eased;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                background: COLORS.card,
                borderRadius: 32,
                padding: "26px 38px",
                border: `3px solid ${COLORS.border}`,
                boxShadow: "0 18px 50px -22px rgba(15,42,46,0.22)",
                transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
                opacity: enter,
              }}
            >
              <div
                style={{
                  fontSize: 78,
                  fontWeight: 900,
                  color: stat.color,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 320,
                  letterSpacing: -2,
                  lineHeight: 1,
                }}
              >
                {formatNumber(displayed)}
                <span style={{ color: stat.color }}>{stat.suffix}</span>
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.ink,
                  flex: 1,
                  lineHeight: 1.2,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};