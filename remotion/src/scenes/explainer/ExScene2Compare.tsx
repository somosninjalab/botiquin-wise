import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "¿Te imaginas ir a TODAS las farmacias buscando la más barata?"
export const ExScene2Compare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });

  const titleY = interpolate(titleIn, [0, 1], [60, 0]);
  const subY = interpolate(subIn, [0, 1], [40, 0]);

  // Pins drop in sequence
  const pins = [
    { x: 140, y: 980, label: "Bs. 320", delay: 25, c: palette.accent },
    { x: 380, y: 1120, label: "Bs. 280", delay: 38, c: palette.yellow },
    { x: 620, y: 1020, label: "Bs. 410", delay: 51, c: palette.accentSoft },
    { x: 220, y: 1280, label: "Bs. 360", delay: 64, c: palette.accent },
    { x: 720, y: 1280, label: "Bs. 295", delay: 77, c: palette.yellow },
    { x: 460, y: 1420, label: "Bs. 340", delay: 90, c: palette.accentSoft },
  ];

  // After pins all drop, a giant "?" floats
  const qIn = spring({ frame: frame - 115, fps, config: { damping: 10 } });

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.primary} x={760} y={-80} size={420} />
      <FloatingBlob color={palette.accentSoft} x={-120} y={1500} size={520} phase={30} />
      <Grain />

      <AbsoluteFill style={{ padding: "170px 70px 0", color: palette.ink }}>
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
          ¿Y recorrer <br />
          <span style={{ color: palette.primary }}>TODAS</span> las <br />
          farmacias?
        </div>
        <div
          style={{
            marginTop: 36,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 38,
            color: palette.inkSoft,
            transform: `translateY(${subY}px)`,
            opacity: subIn,
            maxWidth: 820,
            lineHeight: 1.25,
          }}
        >
          Imposible. <br />
          Y aun así, te toca pagar.
        </div>
      </AbsoluteFill>

      {/* Map area with pins */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 920,
          bottom: 180,
          borderRadius: 36,
          background: "rgba(255,255,255,0.55)",
          border: `3px dashed ${palette.inkSoft}`,
          overflow: "hidden",
        }}
      >
        {/* subtle grid */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 60} x2="100%" y2={i * 60} stroke={palette.inkSoft} strokeWidth="1" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="100%" stroke={palette.inkSoft} strokeWidth="1" />
          ))}
        </svg>

        {pins.map((p, i) => {
          const local = Math.max(0, frame - p.delay);
          const drop = spring({ frame: local, fps, config: { damping: 10, stiffness: 180 } });
          const float = Math.sin((frame + i * 7) / 14) * 4;
          const y = interpolate(drop, [0, 1], [-160, 0]) + float;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x - 60,
                top: p.y - 920 + y,
                opacity: drop,
              }}
            >
              {/* Pin */}
              <svg width="80" height="100" viewBox="0 0 80 100">
                <path d="M40 0 C18 0 0 18 0 40 C0 70 40 100 40 100 C40 100 80 70 80 40 C80 18 62 0 40 0 Z" fill={p.c} stroke={palette.ink} strokeWidth="4" />
                <circle cx="40" cy="38" r="14" fill={palette.white} stroke={palette.ink} strokeWidth="3" />
              </svg>
              <div
                style={{
                  marginTop: -6,
                  padding: "6px 12px",
                  background: palette.white,
                  border: `3px solid ${palette.ink}`,
                  borderRadius: 10,
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 22,
                  color: palette.ink,
                  textAlign: "center",
                  boxShadow: "3px 3px 0 #0B1B2B",
                }}
              >
                {p.label}
              </div>
            </div>
          );
        })}

        {/* Giant question mark */}
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 30,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 260,
            color: palette.accent,
            opacity: qIn * 0.85,
            transform: `scale(${interpolate(qIn, [0, 1], [0.3, 1])}) rotate(${interpolate(qIn, [0, 1], [-20, 8])}deg)`,
            transformOrigin: "center",
            lineHeight: 1,
          }}
        >
          ?
        </div>
      </div>
    </AbsoluteFill>
  );
};