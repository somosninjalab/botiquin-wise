import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile, Img } from "remotion";
import { Background, FloatingBlob, Grain } from "../../components/Background";
import { display, body, palette } from "../../theme";

// "Alerta Medicina lo hace por ti" — phone mockup with comparison
export const ExScene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14 } });
  const titleY = interpolate(titleIn, [0, 1], [40, 0]);

  const phoneIn = spring({ frame: frame - 12, fps, config: { damping: 16, stiffness: 120 } });
  const phoneY = interpolate(phoneIn, [0, 1], [600, 0]);

  const rows = [
    { name: "Farmatodo", price: "Bs. 410", best: false, delay: 45 },
    { name: "Locatel", price: "Bs. 360", best: false, delay: 58 },
    { name: "SAAS", price: "Bs. 320", best: false, delay: 71 },
    { name: "Farmahorro", price: "Bs. 280", best: true, delay: 84 },
  ];

  const checkIn = spring({ frame: frame - 120, fps, config: { damping: 10, stiffness: 180 } });

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <FloatingBlob color={palette.primary} x={-120} y={-100} size={460} />
      <FloatingBlob color={palette.yellow} x={780} y={1550} size={520} phase={25} />
      <Grain />

      {/* Top: logo + title */}
      <AbsoluteFill style={{ padding: "120px 70px 0", color: palette.ink }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            transform: `translateY(${titleY}px)`,
            opacity: titleIn,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: palette.white,
              border: `4px solid ${palette.ink}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "6px 6px 0 #0B1B2B",
              overflow: "hidden",
            }}
          >
            <Img src={staticFile("logo.png")} style={{ width: 84, height: 84, objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 56, lineHeight: 1, color: palette.primaryDeep }}>
              ¡Alerta:
            </div>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 56, lineHeight: 1, color: palette.ink }}>
              Medicina!
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            fontFamily: display,
            fontWeight: 700,
            fontSize: 72,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            opacity: titleIn,
            transform: `translateY(${titleY}px)`,
          }}
        >
          Lo hace <span style={{ color: palette.accent }}>por ti.</span>
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: body,
            fontSize: 32,
            color: palette.inkSoft,
            opacity: titleIn,
            maxWidth: 760,
          }}
        >
          Compara precios en todas las farmacias en segundos.
        </div>
      </AbsoluteFill>

      {/* Phone mockup */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 80,
          width: 560,
          height: 1020,
          marginLeft: -280,
          borderRadius: 64,
          background: palette.ink,
          padding: 16,
          transform: `translateY(${phoneY}px) rotate(-3deg)`,
          opacity: phoneIn,
          boxShadow: "20px 20px 0 rgba(11,27,43,0.25)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 50,
            background: palette.bg,
            padding: "44px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "hidden",
          }}
        >
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 30, color: palette.primaryDeep }}>
            Acetaminofén 500mg
          </div>
          <div style={{ fontFamily: body, fontSize: 22, color: palette.inkSoft, marginBottom: 14 }}>
            4 farmacias comparadas
          </div>

          {rows.map((r, i) => {
            const local = Math.max(0, frame - r.delay);
            const inSp = spring({ frame: local, fps, config: { damping: 16, stiffness: 140 } });
            const x = interpolate(inSp, [0, 1], [400, 0]);
            const op = inSp;
            const bestActive = r.best && frame > 120;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "18px 22px",
                  borderRadius: 18,
                  background: bestActive ? palette.primary : palette.white,
                  border: `3px solid ${bestActive ? palette.primaryDeep : palette.ink}`,
                  transform: `translateX(${x}px) scale(${bestActive ? interpolate(checkIn, [0, 1], [1, 1.05]) : 1})`,
                  opacity: op,
                  color: bestActive ? palette.white : palette.ink,
                  fontFamily: display,
                  fontWeight: 700,
                  boxShadow: bestActive ? "6px 6px 0 #0B1B2B" : "none",
                }}
              >
                <span style={{ fontSize: 28 }}>{r.name}</span>
                <span style={{ fontSize: 32 }}>{r.price}</span>
              </div>
            );
          })}

          {/* "MÁS BARATO" badge */}
          <div
            style={{
              alignSelf: "flex-end",
              marginTop: 6,
              padding: "10px 18px",
              borderRadius: 14,
              background: palette.accent,
              border: `3px solid ${palette.ink}`,
              color: palette.white,
              fontFamily: display,
              fontWeight: 700,
              fontSize: 22,
              transform: `scale(${checkIn}) rotate(${interpolate(checkIn, [0, 1], [-10, -4])}deg)`,
              opacity: checkIn,
              boxShadow: "4px 4px 0 #0B1B2B",
            }}
          >
            ✓ MÁS BARATO
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};