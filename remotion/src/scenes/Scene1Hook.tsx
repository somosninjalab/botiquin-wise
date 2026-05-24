import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../components/Background";
import { display, body, palette } from "../theme";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });
  const arrowProgress = interpolate(frame, [15, 70], [0, 1], { extrapolateRight: "clamp" });

  const titleY = interpolate(titleIn, [0, 1], [60, 0]);
  const subY = interpolate(subIn, [0, 1], [40, 0]);

  // animated rising prices
  const prices = [
    { label: "Bs. 80", color: palette.yellow, x: 80, y: 1180, delay: 25 },
    { label: "Bs. 140", color: palette.accentSoft, x: 460, y: 1320, delay: 38 },
    { label: "Bs. 260", color: palette.accent, x: 780, y: 1100, delay: 52 },
  ];

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.accentSoft} x={-120} y={-100} size={420} />
      <FloatingBlob color={palette.yellow} x={780} y={1500} size={520} phase={20} />
      <Grain />

      <AbsoluteFill style={{ padding: "200px 80px 0", color: palette.ink }}>
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
          ¿Sientes que <br />
          las medicinas <br />
          <span style={{ color: palette.accent }}>nunca paran</span> <br />
          de subir?
        </div>

        <div
          style={{
            marginTop: 50,
            fontFamily: body,
            fontWeight: 400,
            fontSize: 36,
            color: palette.inkSoft,
            transform: `translateY(${subY}px)`,
            opacity: subIn,
            maxWidth: 760,
          }}
        >
          Cada visita a la farmacia es una sorpresa…
        </div>
      </AbsoluteFill>

      {/* Floating price tags rising */}
      {prices.map((p, i) => {
        const local = Math.max(0, frame - p.delay);
        const rise = spring({ frame: local, fps, config: { damping: 12, stiffness: 120 } });
        const float = Math.sin((frame + i * 10) / 14) * 8;
        const y = interpolate(rise, [0, 1], [p.y + 200, p.y]) + float;
        const op = interpolate(rise, [0, 1], [0, 1]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: y,
              opacity: op,
              padding: "18px 32px",
              borderRadius: 24,
              background: p.color,
              border: "4px solid #0B1B2B",
              fontFamily: display,
              fontWeight: 700,
              fontSize: 48,
              color: palette.ink,
              boxShadow: "8px 8px 0 #0B1B2B",
              transform: `rotate(${i % 2 === 0 ? -4 : 5}deg)`,
            }}
          >
            {p.label} ↑
          </div>
        );
      })}

      {/* Big arrow up */}
      <svg
        width="180"
        height="320"
        viewBox="0 0 180 320"
        style={{ position: "absolute", right: 80, top: 220, opacity: arrowProgress }}
      >
        <path
          d={`M 90 ${320 - arrowProgress * 280} L 90 320`}
          stroke={palette.accent}
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 30 60 L 90 0 L 150 60"
          stroke={palette.accent}
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: arrowProgress }}
        />
      </svg>
    </AbsoluteFill>
  );
};