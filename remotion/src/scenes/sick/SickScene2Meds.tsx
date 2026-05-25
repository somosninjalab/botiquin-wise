import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "Y las medicinas… MÁS." — escalating prices
export const SickScene2Meds: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const titleY = interpolate(titleIn, [0, 1], [60, 0]);

  const masIn = spring({ frame: frame - 30, fps, config: { damping: 8, stiffness: 200 } });

  // Bars that grow upward in a staggered, escalating fashion
  const bars = [
    { label: "Bs. 180", h: 240, delay: 20, c: palette.yellow },
    { label: "Bs. 320", h: 360, delay: 38, c: palette.accentSoft },
    { label: "Bs. 480", h: 520, delay: 56, c: palette.accent },
    { label: "Bs. 720", h: 700, delay: 74, c: "#D9532A" },
  ];

  // arrow flying up
  const arrowIn = spring({ frame: frame - 100, fps, config: { damping: 10, stiffness: 160 } });

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.accent} x={780} y={-100} size={420} />
      <FloatingBlob color={palette.yellow} x={-120} y={1500} size={520} phase={25} />
      <Grain />

      <AbsoluteFill style={{ padding: "170px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 1.02,
            letterSpacing: -2,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          Y las <br />
          medicinas…
        </div>

        <div
          style={{
            marginTop: 18,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 200,
            lineHeight: 1,
            letterSpacing: -6,
            color: palette.accent,
            transform: `scale(${masIn}) rotate(${interpolate(masIn, [0, 1], [-8, -2])}deg)`,
            opacity: masIn,
            transformOrigin: "left center",
            textShadow: "8px 8px 0 #0B1B2B",
          }}
        >
          MÁS.
        </div>
      </AbsoluteFill>

      {/* Bars chart at bottom */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 140,
          height: 760,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 28,
        }}
      >
        {bars.map((b, i) => {
          const local = Math.max(0, frame - b.delay);
          const grow = spring({ frame: local, fps, config: { damping: 16, stiffness: 140 } });
          const h = b.h * grow;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 30,
                  color: palette.ink,
                  opacity: grow,
                }}
              >
                {b.label}
              </div>
              <div
                style={{
                  width: "100%",
                  height: h,
                  background: b.c,
                  border: `4px solid ${palette.ink}`,
                  borderBottom: "none",
                  boxShadow: "6px 0 0 rgba(11,27,43,0.15)",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
              />
            </div>
          );
        })}

        {/* Up arrow soaring */}
        <div
          style={{
            position: "absolute",
            right: -10,
            bottom: 600,
            transform: `translateY(${interpolate(arrowIn, [0, 1], [200, -80])}px) rotate(${interpolate(arrowIn, [0, 1], [0, -18])}deg)`,
            opacity: arrowIn,
          }}
        >
          <svg width="160" height="220" viewBox="0 0 160 220">
            <path
              d="M80 0 L160 90 L110 90 L110 220 L50 220 L50 90 L0 90 Z"
              fill={palette.accent}
              stroke={palette.ink}
              strokeWidth="6"
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};