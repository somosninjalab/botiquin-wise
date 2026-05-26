import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "¿Te duele algo?" — fast hook
export const PainScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t1 = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const t2 = spring({ frame: frame - 14, fps, config: { damping: 10, stiffness: 200 } });
  const sub = spring({ frame: frame - 35, fps, config: { damping: 16 } });

  const bob = Math.sin(frame / 6) * 8;

  // Floating question marks
  const qs = [
    { x: 120, y: 280, size: 200, rot: -14, delay: 8, color: palette.accent },
    { x: 780, y: 420, size: 160, rot: 16, delay: 22, color: palette.primary },
    { x: 220, y: 1500, size: 180, rot: -8, delay: 36, color: palette.yellow },
    { x: 820, y: 1640, size: 140, rot: 22, delay: 50, color: palette.accentSoft },
  ];

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.accentSoft} x={-160} y={-100} size={520} />
      <FloatingBlob color={palette.primary} x={760} y={1500} size={520} phase={20} />
      <Grain />

      {qs.map((q, i) => {
        const s = spring({ frame: frame - q.delay, fps, config: { damping: 9, stiffness: 200 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: q.x,
              top: q.y + Math.sin((frame + i * 10) / 8) * 12,
              fontFamily: display,
              fontWeight: 700,
              fontSize: q.size,
              color: q.color,
              transform: `scale(${s}) rotate(${q.rot}deg)`,
              opacity: s * 0.85,
              textShadow: "6px 6px 0 rgba(15,42,46,0.15)",
            }}
          >
            ?
          </div>
        );
      })}

      <AbsoluteFill style={{ padding: "640px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 132,
            lineHeight: 0.95,
            letterSpacing: -3.5,
            transform: `translateY(${interpolate(t1, [0, 1], [60, 0])}px) translateY(${bob}px)`,
            opacity: t1,
          }}
        >
          ¿Te duele
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 200,
            lineHeight: 0.95,
            letterSpacing: -6,
            color: palette.accent,
            transform: `scale(${t2}) rotate(${interpolate(t2, [0, 1], [-8, -2])}deg)`,
            opacity: t2,
            transformOrigin: "left center",
            textShadow: "10px 10px 0 #0F2A2E",
            marginTop: 10,
          }}
        >
          ALGO?
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 44,
            color: palette.inkSoft,
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [30, 0])}px)`,
          }}
        >
          No estás solo.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};