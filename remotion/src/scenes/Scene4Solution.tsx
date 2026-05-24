import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../components/Background";
import { PillIcon } from "../components/PillIcon";
import { display, body, palette } from "../theme";

export const Scene4Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Burst — concentric rings expanding from center
  const burst = spring({ frame, fps, config: { damping: 11, stiffness: 80 } });

  const pillIn = spring({ frame: frame - 8, fps, config: { damping: 9, stiffness: 130 } });
  const pillRot = interpolate(frame, [0, 130], [-180, -15]);

  const wordAlerta = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const wordMedicina = spring({ frame: frame - 32, fps, config: { damping: 14 } });
  const tagIn = spring({ frame: frame - 55, fps, config: { damping: 18 } });
  const subIn = spring({ frame: frame - 70, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ background: palette.ink }}>
      {/* radial wash */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #144B6A 0%, #0B1B2B 60%, #050E18 100%)",
        }}
      />
      <FloatingBlob color={palette.primary} x={-180} y={1300} size={520} />
      <FloatingBlob color={palette.accent} x={760} y={-160} size={460} phase={20} />

      {/* expanding rings */}
      {[0, 1, 2, 3].map((i) => {
        const local = Math.max(0, frame - i * 8);
        const s = spring({ frame: local, fps, config: { damping: 30, stiffness: 40 } });
        const r = interpolate(s, [0, 1], [0, 1100]);
        const op = interpolate(s, [0, 1], [0.6, 0]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 - r,
              top: 700 - r,
              width: r * 2,
              height: r * 2,
              border: `4px solid ${palette.primary}`,
              borderRadius: "50%",
              opacity: op,
            }}
          />
        );
      })}
      <Grain />

      {/* Pill icon */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 460,
          display: "flex",
          justifyContent: "center",
          opacity: pillIn,
          transform: `scale(${0.4 + pillIn * 0.6}) rotate(${pillRot}deg)`,
          transformOrigin: "center",
        }}
      >
        <PillIcon size={280} rotation={0} colorA={palette.accent} colorB={palette.white} />
      </div>

      {/* Brand name */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 780,
          textAlign: "center",
          color: palette.white,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 130,
          lineHeight: 0.95,
          letterSpacing: -3,
        }}
      >
        <div
          style={{
            opacity: wordAlerta,
            transform: `translateY(${interpolate(wordAlerta, [0, 1], [40, 0])}px)`,
            color: palette.accent,
          }}
        >
          ¡ALERTA!
        </div>
        <div
          style={{
            opacity: wordMedicina,
            transform: `translateY(${interpolate(wordMedicina, [0, 1], [40, 0])}px)`,
            color: palette.white,
            marginTop: 8,
          }}
        >
          MEDICINA
        </div>
      </div>

      {/* tagline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1130,
          textAlign: "center",
          opacity: tagIn,
          transform: `translateY(${interpolate(tagIn, [0, 1], [30, 0])}px)`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: palette.yellow,
            color: palette.ink,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 38,
            padding: "16px 36px",
            borderRadius: 999,
            border: "4px solid #0B1B2B",
            boxShadow: "8px 8px 0 #0B1B2B",
          }}
        >
          Encuentra dónde están las más baratas
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1260,
          textAlign: "center",
          color: "#CDE7E7",
          fontFamily: body,
          fontSize: 36,
          lineHeight: 1.3,
          opacity: subIn,
          transform: `translateY(${interpolate(subIn, [0, 1], [30, 0])}px)`,
        }}
      >
        Comparamos precios en farmacias <br /> y te avisamos cuando bajan.
      </div>
      <Grain />
      <FlashOverlay frame={frame} />
    </AbsoluteFill>
  );
};

const FlashOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [0, 6, 14], [1, 0.4, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: "white",
        opacity: op,
        pointerEvents: "none",
      }}
    />
  );
};