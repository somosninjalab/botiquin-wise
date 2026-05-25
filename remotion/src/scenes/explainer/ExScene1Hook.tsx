import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "Cuando vas a la farmacia ahora… estás pagando de más."
export const ExScene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const subIn = spring({ frame: frame - 18, fps, config: { damping: 18 } });
  const stampIn = spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 180 } });

  const titleY = interpolate(titleIn, [0, 1], [60, 0]);
  const subY = interpolate(subIn, [0, 1], [40, 0]);

  // shaking receipt
  const shake = Math.sin(frame / 3) * (frame > 50 ? 3 : 0);

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
            fontSize: 92,
            lineHeight: 1.02,
            letterSpacing: -2,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          Cuando vas <br />
          a la farmacia <br />
          <span style={{ color: palette.accent }}>hoy en día…</span>
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
          sabes que estás <br />
          pagando de más.
        </div>
      </AbsoluteFill>

      {/* Receipt that shakes + grows */}
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: 180,
          width: 340,
          padding: "28px 28px 36px",
          background: palette.white,
          border: `4px solid ${palette.ink}`,
          boxShadow: "10px 10px 0 #0B1B2B",
          transform: `rotate(${-6 + shake}deg) translateY(${interpolate(spring({ frame: frame - 30, fps, config: { damping: 16 } }), [0, 1], [200, 0])}px)`,
          opacity: spring({ frame: frame - 30, fps, config: { damping: 16 } }),
          fontFamily: body,
          color: palette.ink,
        }}
      >
        <div style={{ fontFamily: display, fontWeight: 700, fontSize: 28, marginBottom: 12 }}>FARMACIA</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 6 }}>
          <span>Acetaminofén</span><span>Bs. 180</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 6 }}>
          <span>Vitamina C</span><span>Bs. 240</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, marginBottom: 16 }}>
          <span>Ibuprofeno</span><span>Bs. 320</span>
        </div>
        <div style={{ borderTop: `2px dashed ${palette.ink}`, paddingTop: 12, display: "flex", justifyContent: "space-between", fontFamily: display, fontWeight: 700, fontSize: 32 }}>
          <span>TOTAL</span><span style={{ color: palette.accent }}>Bs. 740</span>
        </div>

        {/* "DE MÁS" stamp */}
        <div
          style={{
            position: "absolute",
            right: -40,
            bottom: -20,
            transform: `rotate(${-12}deg) scale(${stampIn})`,
            opacity: stampIn,
            padding: "12px 26px",
            border: `5px solid ${palette.accent}`,
            color: palette.accent,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 36,
            background: "rgba(255,255,255,0.85)",
            letterSpacing: 2,
          }}
        >
          ¡DE MÁS!
        </div>
      </div>
    </AbsoluteFill>
  );
};