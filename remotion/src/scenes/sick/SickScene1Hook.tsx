import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "Enfermarse es caro."
export const SickScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 18 } });
  const stampIn = spring({ frame: frame - 70, fps, config: { damping: 10, stiffness: 180 } });

  const titleY = interpolate(titleIn, [0, 1], [60, 0]);
  const subY = interpolate(subIn, [0, 1], [40, 0]);

  // gentle wobble on the thermometer once landed
  const wobble = Math.sin(frame / 5) * (frame > 50 ? 2.5 : 0);

  const thermoIn = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const thermoY = interpolate(thermoIn, [0, 1], [300, 0]);

  // mercury fill animation
  const mercury = interpolate(frame, [60, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Background tone="warm" />
      <FloatingBlob color={palette.accentSoft} x={-140} y={-80} size={420} />
      <FloatingBlob color={palette.yellow} x={720} y={1500} size={520} phase={20} />
      <Grain />

      <AbsoluteFill style={{ padding: "180px 70px 0", color: palette.ink }}>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 1.0,
            letterSpacing: -2.5,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          Enfermarse <br />
          es <span style={{ color: palette.accent }}>caro.</span>
        </div>

        <div
          style={{
            marginTop: 44,
            fontFamily: body,
            fontWeight: 600,
            fontSize: 40,
            color: palette.inkSoft,
            transform: `translateY(${subY}px)`,
            opacity: subIn,
            maxWidth: 820,
            lineHeight: 1.25,
          }}
        >
          Faltas al trabajo. <br />
          Pagas consultas. Te recetan…
        </div>
      </AbsoluteFill>

      {/* Big thermometer dropping in */}
      <div
        style={{
          position: "absolute",
          right: 110,
          bottom: 200,
          transform: `translateY(${thermoY}px) rotate(${-8 + wobble}deg)`,
          opacity: thermoIn,
        }}
      >
        <svg width="200" height="640" viewBox="0 0 200 640">
          {/* stem */}
          <rect x="78" y="40" width="44" height="480" rx="22" fill={palette.white} stroke={palette.ink} strokeWidth="6" />
          {/* bulb */}
          <circle cx="100" cy="560" r="70" fill={palette.white} stroke={palette.ink} strokeWidth="6" />
          {/* mercury bulb fill */}
          <circle cx="100" cy="560" r="56" fill={palette.accent} />
          {/* mercury rising in stem */}
          <rect
            x="86"
            y={520 - 470 * mercury}
            width="28"
            height={470 * mercury}
            rx="14"
            fill={palette.accent}
          />
          {/* tick marks */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1="56" y1={100 + i * 50} x2="78" y2={100 + i * 50} stroke={palette.ink} strokeWidth="4" />
          ))}
        </svg>

        {/* "$$$" stamp */}
        <div
          style={{
            position: "absolute",
            left: -120,
            top: 60,
            transform: `rotate(${-14}deg) scale(${stampIn})`,
            opacity: stampIn,
            padding: "12px 22px",
            border: `5px solid ${palette.accent}`,
            color: palette.accent,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 56,
            background: "rgba(255,255,255,0.9)",
            letterSpacing: 4,
          }}
        >
          $$$
        </div>
      </div>
    </AbsoluteFill>
  );
};