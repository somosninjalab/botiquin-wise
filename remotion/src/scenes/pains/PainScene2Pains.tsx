import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// Rapid-fire pain points list
const PAINS = [
  { emoji: "🤕", label: "Dolor de cabeza", color: palette.accent },
  { emoji: "🤒", label: "Fiebre", color: "#D9532A" },
  { emoji: "🤧", label: "Gripe y tos", color: palette.primary },
  { emoji: "💪", label: "Dolor muscular", color: palette.yellow },
  { emoji: "😣", label: "Acidez", color: palette.accentSoft },
  { emoji: "🤰", label: "Alergias", color: palette.primaryDeep },
];

export const PainScene2Pains: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.accent} x={-100} y={1400} size={500} />
      <FloatingBlob color={palette.primary} x={780} y={-80} size={420} phase={15} />
      <Grain />

      <AbsoluteFill style={{ padding: "150px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 84,
            lineHeight: 1.0,
            letterSpacing: -2,
            transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
            opacity: titleIn,
          }}
        >
          Lo que <span style={{ color: palette.accent }}>todos</span><br />
          sufrimos:
        </div>

        <div
          style={{
            marginTop: 60,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {PAINS.map((p, i) => {
            const delay = 18 + i * 10;
            const s = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 200 } });
            const x = interpolate(s, [0, 1], [-300, 0]);
            const rot = interpolate(s, [0, 1], [-6, 0]);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "20px 32px",
                  background: palette.white,
                  border: `5px solid ${palette.ink}`,
                  borderRadius: 24,
                  boxShadow: `8px 8px 0 ${p.color}`,
                  transform: `translateX(${x}px) rotate(${rot}deg)`,
                  opacity: s,
                  width: "fit-content",
                  maxWidth: 880,
                }}
              >
                <div style={{ fontSize: 64, lineHeight: 1 }}>{p.emoji}</div>
                <div
                  style={{
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 52,
                    color: palette.ink,
                    letterSpacing: -1,
                  }}
                >
                  {p.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};