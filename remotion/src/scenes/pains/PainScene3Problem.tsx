import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// Chaos of prices and pharmacies
export const PainScene3Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });

  const tickets = [
    { x: 80, y: 720, rot: -10, label: "Farmatodo", price: "Bs. 480", delay: 18, c: palette.accentSoft },
    { x: 560, y: 820, rot: 8, label: "Locatel", price: "Bs. 620", delay: 30, c: palette.yellow },
    { x: 120, y: 1080, rot: 6, label: "Farmago", price: "Bs. 390", delay: 42, c: palette.primary },
    { x: 580, y: 1180, rot: -12, label: "SAAS", price: "Bs. 310", delay: 54, c: palette.accent },
    { x: 320, y: 1420, rot: 4, label: "Farmahorro", price: "Bs. 540", delay: 66, c: palette.accentSoft },
  ];

  // Big "?" question wobble
  const qScale = spring({ frame: frame - 78, fps, config: { damping: 9, stiffness: 200 } });

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.yellow} x={780} y={1500} size={460} />
      <FloatingBlob color={palette.accent} x={-140} y={-80} size={420} phase={12} />
      <Grain />

      <AbsoluteFill style={{ padding: "140px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 80,
            lineHeight: 1.0,
            letterSpacing: -2,
            transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
            opacity: titleIn,
          }}
        >
          ¿Dónde compro <br />
          al <span style={{ color: palette.accent }}>mejor precio?</span>
        </div>
      </AbsoluteFill>

      {tickets.map((t, i) => {
        const s = spring({ frame: frame - t.delay, fps, config: { damping: 10, stiffness: 180 } });
        const wob = Math.sin((frame + i * 5) / 14) * 4;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              transform: `scale(${s}) rotate(${t.rot + wob}deg)`,
              opacity: s,
              padding: "20px 28px",
              background: palette.white,
              border: `5px solid ${palette.ink}`,
              borderRadius: 18,
              boxShadow: `8px 8px 0 ${t.c}`,
              minWidth: 360,
            }}
          >
            <div
              style={{
                fontFamily: body,
                fontWeight: 600,
                fontSize: 26,
                color: palette.inkSoft,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {t.label}
            </div>
            <div
              style={{
                fontFamily: display,
                fontWeight: 700,
                fontSize: 60,
                color: palette.ink,
                letterSpacing: -1.5,
                marginTop: 4,
              }}
            >
              {t.price}
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          right: 90,
          top: 700,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 360,
          lineHeight: 1,
          color: palette.accent,
          opacity: qScale * 0.9,
          transform: `scale(${qScale}) rotate(${interpolate(qScale, [0, 1], [-20, 8])}deg)`,
          textShadow: "12px 12px 0 #0F2A2E",
        }}
      >
        ?
      </div>
    </AbsoluteFill>
  );
};