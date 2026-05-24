import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../components/Background";
import { display, body, palette } from "../theme";

const pins = [
  { x: 140, y: 1080, delay: 4, color: palette.accent },
  { x: 380, y: 1280, delay: 12, color: palette.primary },
  { x: 620, y: 1130, delay: 18, color: palette.yellow },
  { x: 820, y: 1340, delay: 26, color: palette.accent },
  { x: 240, y: 1480, delay: 34, color: palette.primary },
  { x: 700, y: 1560, delay: 40, color: palette.yellow },
];

const questions = [
  { ch: "?", x: 80, y: 540, delay: 12, size: 220, color: palette.accent, rot: -12 },
  { ch: "?", x: 760, y: 420, delay: 22, size: 180, color: palette.primary, rot: 14 },
  { ch: "?", x: 880, y: 760, delay: 32, size: 140, color: palette.yellow, rot: -8 },
];

export const Scene3Problem2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleIn, [0, 1], [-50, 0]);

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color="#7CC3C2" x={-200} y={400} size={460} />
      <FloatingBlob color={palette.accentSoft} x={760} y={1500} size={500} phase={15} />
      <Grain />

      <div
        style={{
          position: "absolute",
          top: 130,
          left: 80,
          right: 80,
          color: palette.ink,
          transform: `translateY(${titleY}px)`,
          opacity: titleIn,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontWeight: 600,
            fontSize: 30,
            color: palette.primaryDeep,
            textTransform: "uppercase",
            letterSpacing: 4,
            marginBottom: 16,
          }}
        >
          Problema #2
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          ¿Dónde <br />
          están <span style={{ color: palette.primary }}>las más <br />baratas?</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: body,
            fontSize: 32,
            color: palette.inkSoft,
            maxWidth: 720,
          }}
        >
          No hay forma de saberlo… llamando una por una.
        </div>
      </div>

      {/* Big floating question marks */}
      {questions.map((q, i) => {
        const local = Math.max(0, frame - q.delay);
        const s = spring({ frame: local, fps, config: { damping: 10, stiffness: 120 } });
        const float = Math.sin((frame + i * 18) / 16) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: q.x,
              top: q.y + float,
              fontFamily: display,
              fontWeight: 700,
              fontSize: q.size,
              color: q.color,
              opacity: s * 0.35,
              transform: `rotate(${q.rot}deg) scale(${s})`,
              textShadow: "6px 6px 0 #0B1B2B22",
            }}
          >
            {q.ch}
          </div>
        );
      })}

      {/* Map area at bottom */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 1000,
          height: 720,
          borderRadius: 36,
          background: "#D9F0EF",
          border: "5px solid #0B1B2B",
          boxShadow: "14px 14px 0 #0B1B2B",
          overflow: "hidden",
        }}
      >
        {/* grid lines */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`h${i}`} x1="0" x2="100%" y1={i * 90} y2={i * 90} stroke="#0B1B2B" strokeWidth="1" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 130} x2={i * 130} y1="0" y2="100%" stroke="#0B1B2B" strokeWidth="1" />
          ))}
        </svg>

        {pins.map((p, i) => {
          const local = Math.max(0, frame - p.delay);
          const drop = spring({ frame: local, fps, config: { damping: 8, stiffness: 180 } });
          const ty = interpolate(drop, [0, 1], [-200, 0]);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x - 60,
                top: p.y - 1000 + ty,
                opacity: drop,
              }}
            >
              <svg width="80" height="100" viewBox="0 0 80 100">
                <path
                  d="M 40 95 Q 10 60 10 35 A 30 30 0 1 1 70 35 Q 70 60 40 95 Z"
                  fill={p.color}
                  stroke="#0B1B2B"
                  strokeWidth="5"
                />
                <circle cx="40" cy="35" r="10" fill="#0B1B2B" />
              </svg>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};