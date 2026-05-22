import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  random,
} from "remotion";
import {
  TransitionSeries,
  springTiming,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

/* ---------- shared backdrop ---------- */
function Blobs() {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: COLORS.primaryGlow,
          opacity: 0.16,
          filter: "blur(120px)",
          top: -220 + Math.sin(t * 0.6) * 50,
          left: -220 + Math.cos(t * 0.4) * 50,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: COLORS.accent,
          opacity: 0.12,
          filter: "blur(120px)",
          bottom: -240 + Math.cos(t * 0.5) * 50,
          right: -240 + Math.sin(t * 0.7) * 50,
        }}
      />
    </AbsoluteFill>
  );
}

/* ---------- Scene 1: Hook "Nos tumbaron" ---------- */
function Scene1Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glitch shake
  const shake = interpolate(frame, [0, 40], [16, 0], { extrapolateRight: "clamp" });
  const sx = Math.sin(frame * 1.7) * shake;
  const sy = Math.cos(frame * 2.3) * shake;

  // Static noise bars
  const bars = Array.from({ length: 18 }).map((_, i) => ({
    y: i * 110,
    on: random(`bar-${i}-${Math.floor(frame / 3)}`) > 0.55,
    h: 6 + random(`bar-h-${i}`) * 18,
  }));

  const headS = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 140 } });
  const subS = spring({ frame: frame - 60, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: "#0F2A2E",
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
      }}
    >
      {/* static noise */}
      <AbsoluteFill style={{ opacity: interpolate(frame, [0, 30, 70], [0.35, 0.18, 0.05]) }}>
        {bars.map((b, i) =>
          b.on ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: b.y,
                height: b.h,
                background: i % 3 === 0 ? COLORS.accent : "#fff",
                opacity: 0.25,
                mixBlendMode: "screen",
              }}
            />
          ) : null,
        )}
      </AbsoluteFill>

      <div
        style={{
          textAlign: "center",
          transform: `translate(${sx}px, ${sy}px)`,
          maxWidth: 980,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: 8,
            opacity: interpolate(frame, [4, 18], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          ⚠ SIN SEÑAL
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 150,
            fontWeight: 900,
            color: "#fff",
            lineHeight: 0.95,
            letterSpacing: -5,
            opacity: headS,
            transform: `scale(${interpolate(headS, [0, 1], [0.9, 1])})`,
            textShadow:
              frame < 45 && frame % 4 < 2
                ? `4px 0 ${COLORS.accent}, -4px 0 ${COLORS.primaryGlow}`
                : "none",
          }}
        >
          NOS
          <br />
          TUMBARON.
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 40,
            fontWeight: 600,
            color: "#B8DDD3",
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [20, 0])}px)`,
          }}
        >
          (sí, en serio)
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 2: Why ---------- */
function Scene2Why() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const t1 = spring({ frame: frame - 6, fps, config: { damping: 18 } });
  const t2 = spring({ frame: frame - 28, fps, config: { damping: 18 } });
  const t3 = spring({ frame: frame - 52, fps, config: { damping: 16 } });

  // Rising bars chart
  const bars = [0.25, 0.42, 0.58, 0.74, 0.95];
  const chartProgress = interpolate(frame, [60, 130], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: 80,
        paddingTop: 180,
        alignItems: "center",
      }}
    >
      <Blobs />
      <div style={{ textAlign: "center", maxWidth: 920, position: "relative" }}>
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: COLORS.accent,
            letterSpacing: 4,
            opacity: t1,
            transform: `translateY(${interpolate(t1, [0, 1], [20, 0])}px)`,
          }}
        >
          ¿LA RAZÓN?
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 84,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.02,
            letterSpacing: -3,
            opacity: t2,
            transform: `translateY(${interpolate(t2, [0, 1], [30, 0])}px)`,
          }}
        >
          Demasiada gente
          <br />
          se enteró de lo{" "}
          <span style={{ color: COLORS.accent }}>caras</span>
          <br />
          que estaban sus
          <br />
          medicinas.
        </div>
      </div>

      {/* rising chart */}
      <div
        style={{
          marginTop: 80,
          width: 760,
          height: 360,
          background: "#fff",
          borderRadius: 32,
          border: `1px solid ${COLORS.border}`,
          padding: 36,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          boxShadow: "0 30px 60px -30px rgba(15,42,46,0.25)",
          opacity: t3,
          transform: `translateY(${interpolate(t3, [0, 1], [40, 0])}px)`,
          position: "relative",
        }}
      >
        {bars.map((h, i) => {
          const localT = interpolate(chartProgress, [i / bars.length * 0.7, (i + 1) / bars.length * 0.7 + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const hh = h * 270 * localT;
          return (
            <div
              key={i}
              style={{
                width: 96,
                height: hh,
                borderRadius: 14,
                background: i === bars.length - 1
                  ? `linear-gradient(180deg, ${COLORS.accent}, #d96d2c)`
                  : `linear-gradient(180deg, ${COLORS.primaryGlow}, ${COLORS.primary})`,
              }}
            />
          );
        })}
        {/* arrow */}
        <svg
          style={{ position: "absolute", top: 30, right: 36, opacity: interpolate(chartProgress, [0.6, 1], [0, 1], { extrapolateRight: "clamp" }) }}
          width="110"
          height="110"
          viewBox="0 0 24 24"
          fill="none"
          stroke={COLORS.accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7 17L17 7" />
          <path d="M9 7h8v8" />
        </svg>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 3: Comeback ---------- */
function Scene3Comeback() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flash = interpolate(frame, [0, 6, 14], [0.9, 0.4, 0], { extrapolateRight: "clamp" });
  const pillS = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 180 } });
  const ringR = interpolate(frame, [20, 100], [0, 1.7], { extrapolateRight: "clamp" });
  const ringO = interpolate(frame, [20, 100], [0.5, 0], { extrapolateRight: "clamp" });
  const titleS = spring({ frame: frame - 26, fps, config: { damping: 16 } });
  const subS = spring({ frame: frame - 60, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E5F5EE 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 70,
      }}
    >
      <Blobs />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <div style={{ textAlign: "center", position: "relative" }}>
        {/* pulsing ring */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 260,
            height: 260,
            marginLeft: -130,
            marginTop: -130,
            borderRadius: "50%",
            border: `6px solid ${COLORS.primary}`,
            transform: `scale(${ringR})`,
            opacity: ringO,
          }}
        />
        {/* logo pill */}
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: "50%",
            margin: "0 auto",
            background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryGlow} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px -20px rgba(22,163,122,0.55)",
            transform: `scale(${pillS})`,
            opacity: pillS,
          }}
        >
          <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.5 20.5a4.5 4.5 0 0 1-4.5-4.5V8a3 3 0 0 1 6 0v8a1.5 1.5 0 0 0 3 0V8" />
            <line x1="12" y1="11" x2="12" y2="16" />
          </svg>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 130,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 0.98,
            letterSpacing: -4,
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px)`,
          }}
        >
          Pero
          <br />
          <span style={{ color: COLORS.primary }}>estamos</span>
          <br />
          de vuelta.
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.muted,
            opacity: subS,
          }}
        >
          Más fuertes que antes.
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 4: What is it ---------- */
function Scene4What() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 4, fps, config: { damping: 18 } });
  const items = [
    { icon: "🔎", text: "Buscas tu medicina." },
    { icon: "🏥", text: "Vemos en 8 farmacias." },
    { icon: "💸", text: "Te decimos la más barata." },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: 80,
        paddingTop: 150,
        alignItems: "center",
      }}
    >
      <Blobs />
      <div
        style={{
          textAlign: "center",
          fontSize: 40,
          fontWeight: 800,
          color: COLORS.primary,
          letterSpacing: 4,
          opacity: titleS,
          transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
        }}
      >
        ¿QUÉ ES ALERTA MEDICINA?
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.ink,
          textAlign: "center",
          lineHeight: 1.0,
          letterSpacing: -3,
          opacity: titleS,
          maxWidth: 900,
        }}
      >
        El comparador de
        <br />
        <span style={{ color: COLORS.accent }}>precios</span> de
        medicinas
        <br />
        en Venezuela.
      </div>

      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 22, width: "100%", maxWidth: 880 }}>
        {items.map((it, i) => {
          const s = spring({ frame: frame - (30 + i * 22), fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                background: "#fff",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 28,
                padding: "28px 36px",
                display: "flex",
                alignItems: "center",
                gap: 28,
                boxShadow: "0 18px 40px -25px rgba(15,42,46,0.25)",
                opacity: s,
                transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 56,
                  flexShrink: 0,
                }}
              >
                {it.icon}
              </div>
              <div style={{ fontSize: 50, fontWeight: 800, color: COLORS.ink, letterSpacing: -1 }}>
                {it.text}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 38,
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.muted,
          opacity: spring({ frame: frame - 120, fps, config: { damping: 18 } }),
        }}
      >
        Gratis. En segundos.
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 5: Browser typing ---------- */
const URL = "alertamedicina.com";
function Scene5Browser() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const browserS = spring({ frame, fps, config: { damping: 18 } });

  // Typing
  const typeStart = 18;
  const perChar = 4;
  const charsShown = Math.max(0, Math.min(URL.length, Math.floor((frame - typeStart) / perChar)));
  const typed = URL.slice(0, charsShown);
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  // After typing -> page loads
  const loadStart = typeStart + URL.length * perChar + 8;
  const pageS = spring({ frame: frame - loadStart, fps, config: { damping: 18 } });

  // Cursor that moves to URL bar
  const cursorX = interpolate(frame, [4, 16], [800, 230], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [4, 16], [1200, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorO = interpolate(frame, [0, 6, loadStart - 4, loadStart + 4], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0F2A2E 0%, #16403F 100%)`,
        padding: 60,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 220,
      }}
    >
      {/* phone / browser frame */}
      <div
        style={{
          width: 940,
          height: 1380,
          background: "#fff",
          borderRadius: 56,
          overflow: "hidden",
          boxShadow: "0 50px 120px -20px rgba(0,0,0,0.55)",
          transform: `scale(${interpolate(browserS, [0, 1], [0.9, 1])})`,
          opacity: browserS,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* browser chrome */}
        <div
          style={{
            height: 130,
            background: "#EAF3EF",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            gap: 18,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div
            style={{
              marginLeft: 22,
              flex: 1,
              background: "#fff",
              borderRadius: 999,
              border: `2px solid ${COLORS.border}`,
              height: 76,
              display: "flex",
              alignItems: "center",
              padding: "0 28px",
              gap: 16,
              fontSize: 38,
              fontWeight: 700,
              color: COLORS.ink,
              letterSpacing: -0.5,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{typed}</span>
            {charsShown < URL.length && (
              <span style={{ opacity: caretOn ? 1 : 0, color: COLORS.primary }}>|</span>
            )}
          </div>
        </div>

        {/* page content */}
        <div style={{ flex: 1, padding: 40, position: "relative", background: "#fff" }}>
          {pageS > 0.02 ? (
            <div style={{ opacity: pageS, transform: `translateY(${interpolate(pageS, [0, 1], [20, 0])}px)` }}>
              {/* logo + brand */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.5 20.5a4.5 4.5 0 0 1-4.5-4.5V8a3 3 0 0 1 6 0v8a1.5 1.5 0 0 0 3 0V8" />
                    <line x1="12" y1="11" x2="12" y2="16" />
                  </svg>
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: COLORS.ink, letterSpacing: -1 }}>
                  ¡Alerta: Medicina!
                </div>
              </div>

              {/* search bar */}
              <div
                style={{
                  marginTop: 30,
                  height: 88,
                  borderRadius: 20,
                  border: `2px solid ${COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 28px",
                  gap: 16,
                  fontSize: 34,
                  color: COLORS.muted,
                  fontWeight: 600,
                  background: COLORS.bg,
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                Busca tu medicina…
              </div>

              {/* result rows */}
              {[
                { name: "Farmatodo", price: "Bs. 240", bad: true },
                { name: "Locatel", price: "Bs. 198" },
                { name: "SAAS", price: "Bs. 96", best: true },
              ].map((p, i) => {
                const rs = spring({ frame: frame - (loadStart + 14 + i * 8), fps, config: { damping: 18 } });
                return (
                  <div
                    key={i}
                    style={{
                      marginTop: 22,
                      borderRadius: 20,
                      border: `2px solid ${p.best ? COLORS.primary : COLORS.border}`,
                      background: p.best ? "#E9FBF3" : "#fff",
                      padding: "26px 30px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: rs,
                      transform: `translateY(${interpolate(rs, [0, 1], [22, 0])}px)`,
                    }}
                  >
                    <div style={{ fontSize: 36, fontWeight: 800, color: COLORS.ink }}>{p.name}</div>
                    <div
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        color: p.best ? COLORS.primary : p.bad ? COLORS.accent : COLORS.ink,
                        textDecoration: p.bad ? "line-through" : "none",
                      }}
                    >
                      {p.price}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.muted, fontSize: 32, fontWeight: 600 }}>
              {charsShown >= URL.length ? "Cargando…" : ""}
            </div>
          )}
        </div>
      </div>

      {/* fake cursor */}
      <svg
        width="50"
        height="50"
        viewBox="0 0 24 24"
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          opacity: cursorO,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
        }}
      >
        <path d="M3 2l7 18 2-8 8-2z" fill="#fff" stroke="#0F2A2E" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
}

/* ---------- Scene 6: CTA ---------- */
function Scene6CTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bellS = spring({ frame, fps, config: { damping: 10, stiffness: 170 } });
  const ring = Math.sin(frame / 3) * interpolate(frame, [8, 26, 50], [0, 14, 6], { extrapolateRight: "clamp" });
  const followS = spring({ frame: frame - 16, fps, config: { damping: 16 } });
  const tagS = spring({ frame: frame - 50, fps, config: { damping: 18 } });
  const urlS = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 150 } });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, #E5F5EE 100%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <Blobs />
      <div style={{ textAlign: "center", maxWidth: 960, position: "relative" }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: COLORS.accent,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 70px -20px rgba(240,138,75,0.55)",
            transform: `scale(${bellS}) rotate(${ring}deg)`,
            opacity: bellS,
          }}
        >
          <svg width="130" height="130" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 110,
            fontWeight: 900,
            color: COLORS.ink,
            lineHeight: 1.0,
            letterSpacing: -3,
            opacity: followS,
            transform: `translateY(${interpolate(followS, [0, 1], [30, 0])}px)`,
          }}
        >
          Síguenos.
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 52,
            fontWeight: 800,
            color: COLORS.muted,
            lineHeight: 1.15,
            opacity: tagS,
          }}
        >
          Antes de comprar medicina:
          <br />
          <span style={{ color: COLORS.primary, fontWeight: 900 }}>¡Alerta: Medicina!</span>
        </div>

        <div
          style={{
            marginTop: 56,
            display: "inline-block",
            background: COLORS.ink,
            color: "#fff",
            fontSize: 56,
            fontWeight: 900,
            padding: "26px 50px",
            borderRadius: 999,
            letterSpacing: -1,
            opacity: urlS,
            transform: `scale(${urlS})`,
            boxShadow: "0 20px 50px -20px rgba(15,42,46,0.5)",
          }}
        >
          alertamedicina.com
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- root ---------- */
export const ComebackVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />
        <TransitionSeries.Sequence durationInFrames={155}>
          <Scene2Why />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={165}>
          <Scene3Comeback />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 14 })}
        />
        <TransitionSeries.Sequence durationInFrames={185}>
          <Scene4What />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <Scene5Browser />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};