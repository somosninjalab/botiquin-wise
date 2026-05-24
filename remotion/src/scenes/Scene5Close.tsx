import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../components/Background";
import { display, body, palette } from "../theme";

const benefits = [
  { icon: "✓", label: "Gratis", color: palette.primary, delay: 0 },
  { icon: "✓", label: "Siempre actualizado", color: palette.accent, delay: 10 },
  { icon: "✓", label: "Te avisa cuando bajan", color: palette.yellow, delay: 20 },
];

export const Scene5Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headIn = spring({ frame, fps, config: { damping: 14 } });
  const urlIn = spring({ frame: frame - 60, fps, config: { damping: 14 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.03;

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.primary} x={-160} y={-160} size={500} />
      <FloatingBlob color={palette.accentSoft} x={760} y={1400} size={520} phase={20} />
      <Grain />

      <div
        style={{
          position: "absolute",
          top: 220,
          left: 80,
          right: 80,
          textAlign: "center",
          color: palette.ink,
          opacity: headIn,
          transform: `translateY(${interpolate(headIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          Tu aliado <br />
          contra los <br />
          <span style={{ color: palette.accent }}>precios altos.</span>
        </div>
      </div>

      {/* benefits stack */}
      <div
        style={{
          position: "absolute",
          top: 820,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
        }}
      >
        {benefits.map((b, i) => {
          const local = Math.max(0, frame - 10 - b.delay);
          const s = spring({ frame: local, fps, config: { damping: 13, stiffness: 150 } });
          const tx = interpolate(s, [0, 1], [-120, 0]);
          return (
            <div
              key={i}
              style={{
                opacity: s,
                transform: `translateX(${tx}px)`,
                display: "flex",
                alignItems: "center",
                gap: 22,
                background: palette.white,
                padding: "20px 38px",
                borderRadius: 999,
                border: "5px solid #0B1B2B",
                boxShadow: "10px 10px 0 #0B1B2B",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 48,
                color: palette.ink,
              }}
            >
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: b.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: palette.ink,
                  fontSize: 40,
                  border: "4px solid #0B1B2B",
                }}
              >
                {b.icon}
              </span>
              {b.label}
            </div>
          );
        })}
      </div>

      {/* URL pill */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: urlIn,
          transform: `scale(${interpolate(urlIn, [0, 1], [0.7, 1]) * pulse})`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: palette.ink,
            color: palette.white,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 56,
            padding: "26px 56px",
            borderRadius: 999,
            boxShadow: `0 0 0 6px ${palette.accent}, 14px 14px 0 #0B1B2B`,
            letterSpacing: -1,
          }}
        >
          alertamedicina.com
        </span>
      </div>
    </AbsoluteFill>
  );
};