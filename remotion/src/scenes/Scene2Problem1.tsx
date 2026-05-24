import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../components/Background";
import { display, body, palette } from "../theme";

const tags = [
  { name: "Atorvastatina", a: 95, b: 180, delay: 0, x: 70, y: 380, rot: -3 },
  { name: "Losartán", a: 60, b: 130, delay: 12, x: 480, y: 540, rot: 4 },
  { name: "Metformina", a: 45, b: 95, delay: 22, x: 100, y: 720, rot: -2 },
  { name: "Omeprazol", a: 70, b: 155, delay: 32, x: 520, y: 880, rot: 3 },
];

export const Scene2Problem1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 16 } });
  const titleY = interpolate(titleIn, [0, 1], [-60, 0]);

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.accent} x={-160} y={1200} size={520} />
      <FloatingBlob color={palette.yellow} x={700} y={-160} size={460} phase={30} />
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
            color: palette.accent,
            textTransform: "uppercase",
            letterSpacing: 4,
            marginBottom: 16,
          }}
        >
          Problema #1
        </div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          Siempre <br />
          parece que <br />
          están <span style={{ color: palette.accent }}>más caras.</span>
        </div>
      </div>

      {tags.map((t, i) => {
        const local = Math.max(0, frame - 30 - t.delay);
        const rise = spring({ frame: local, fps, config: { damping: 13, stiffness: 140 } });
        const counter = interpolate(local, [10, 60], [t.a, t.b], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        const op = interpolate(rise, [0, 1], [0, 1]);
        const ty = interpolate(rise, [0, 1], [80, 0]);
        const flash = local > 60 && local < 70 ? 1 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: t.x,
              top: t.y,
              opacity: op,
              transform: `translateY(${ty}px) rotate(${t.rot}deg)`,
              background: palette.white,
              border: "5px solid #0B1B2B",
              borderRadius: 28,
              padding: "26px 36px",
              boxShadow: "12px 12px 0 #0B1B2B",
              minWidth: 460,
            }}
          >
            <div
              style={{
                fontFamily: body,
                fontWeight: 600,
                fontSize: 28,
                color: palette.inkSoft,
                marginBottom: 6,
              }}
            >
              {t.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              <span
                style={{
                  fontFamily: body,
                  fontWeight: 400,
                  fontSize: 34,
                  color: palette.inkSoft,
                  textDecoration: "line-through",
                }}
              >
                Bs.{t.a}
              </span>
              <span
                style={{
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 60,
                  color: palette.accent,
                  background: flash ? palette.yellow : "transparent",
                  padding: "0 8px",
                  borderRadius: 8,
                }}
              >
                Bs.{Math.round(counter)}
              </span>
              <span style={{ fontSize: 40, color: palette.accent }}>↑</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};