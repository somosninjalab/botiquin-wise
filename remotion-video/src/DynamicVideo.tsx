import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// === DURATIONS (30fps) — total 540 frames = 18s ===
const D = {
  hook: 70,        // 0   - 70   (2.3s)
  slam: 130,       // 70  - 200  (4.3s)  prices stack
  reveal: 80,      // 200 - 280  (2.7s)  brand reveal
  demo: 110,       // 280 - 390  (3.7s)  app demo
  follow: 80,      // 390 - 470  (2.7s)  follow card
  cta: 70,         // 470 - 540  (2.3s)  alertamedicina.com
};

const PRICES = [
  { name: "Farmatodo", price: 240, color: "#E30613" },
  { name: "Locatel",   price: 215, color: "#0066B3" },
  { name: "Farmago",   price: 198, color: "#00A99D" },
  { name: "GoPharma",  price: 182, color: "#0EA5E9" },
  { name: "SAAS",      price: 96,  color: "#1E9E3E", best: true },
];

function Confetti() {
  const frame = useCurrentFrame();
  const pieces = new Array(40).fill(0);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {pieces.map((_, i) => {
        const seed = i + 1;
        const x = random(`x-${seed}`) * 1080;
        const delay = random(`d-${seed}`) * 20;
        const fall = interpolate(frame - delay, [0, 80], [-50, 1920], { extrapolateLeft: "clamp" });
        const rot = interpolate(frame, [0, 60], [0, 360 * random(`r-${seed}`)]);
        const colors = [COLORS.primary, COLORS.primaryGlow, COLORS.accent, "#F0D08A"];
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: fall,
            width: 14, height: 22, background: colors[i % 4],
            transform: `rotate(${rot}deg)`, borderRadius: 3,
          }} />
        );
      })}
    </AbsoluteFill>
  );
}

function FlashBg({ color, hit }: { color: string; hit: number }) {
  const frame = useCurrentFrame();
  const f = interpolate(frame - hit, [0, 6, 18], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: color, opacity: f }} />;
}

function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = spring({ frame, fps, config: { damping: 8, stiffness: 140 } });
  const s2 = spring({ frame: frame - 14, fps, config: { damping: 8, stiffness: 140 } });
  const s3 = spring({ frame: frame - 28, fps, config: { damping: 10, stiffness: 180 } });
  const shake = Math.sin(frame * 0.9) * 4 * Math.max(0, 1 - frame / 40);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, #FFFFFF 0%, ${COLORS.bg} 60%, #DCF3E8 100%)`, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <FlashBg color={COLORS.primaryGlow} hit={0} />
      {/* floating Bs. price tags */}
      {[
        { x: 80,  y: 200,  v: "Bs. 240", c: COLORS.accent },
        { x: 820, y: 260,  v: "Bs. 215", c: COLORS.primary },
        { x: 120, y: 1500, v: "Bs. 198", c: COLORS.primary },
        { x: 780, y: 1450, v: "Bs. 182", c: COLORS.accent },
        { x: 60,  y: 880,  v: "Bs. 96",  c: COLORS.primary },
        { x: 820, y: 940,  v: "Bs. 240", c: COLORS.accent },
      ].map((t, i) => {
        const float = Math.sin((frame + i * 12) * 0.08) * 18;
        const rot = Math.sin((frame + i * 8) * 0.05) * 8;
        return (
          <div key={i} style={{
            position: "absolute", left: t.x, top: t.y + float,
            transform: `rotate(${rot}deg)`,
            background: "#fff", color: t.c,
            border: `3px solid ${t.c}`,
            padding: "10px 22px", borderRadius: 999,
            fontSize: 38, fontWeight: 900,
            boxShadow: "0 8px 20px rgba(15,42,46,0.10)",
            opacity: 0.95,
          }}>{t.v}</div>
        );
      })}
      <div style={{ transform: `scale(${s1}) translateX(${shake}px)`, fontSize: 220, fontWeight: 900, color: COLORS.ink, lineHeight: 1, letterSpacing: -6 }}>
        ¿Estás
      </div>
      <div style={{ transform: `scale(${s2})`, fontSize: 220, fontWeight: 900, color: COLORS.ink, lineHeight: 1, letterSpacing: -6, marginTop: -20 }}>
        pagando
      </div>
      <div style={{ transform: `scale(${s3})`, fontSize: 280, fontWeight: 900, color: COLORS.primary, lineHeight: 1, letterSpacing: -8, marginTop: -10, textShadow: `0 6px 24px ${COLORS.primaryGlow}60` }}>
        DE MÁS?
      </div>
      <div style={{ marginTop: 60, fontSize: 64, fontWeight: 700, color: COLORS.muted, opacity: interpolate(frame, [40, 55], [0, 1]) }}>
        por tus medicinas
      </div>
    </AbsoluteFill>
  );
}

function SlamScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const STAGGER = 18;
  return (
    <AbsoluteFill style={{ background: "#fff", padding: "80px 60px", justifyContent: "flex-start" }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.muted, textAlign: "center", marginBottom: 30 }}>
        Mismo medicamento:
      </div>
      <div style={{ fontSize: 86, fontWeight: 900, color: COLORS.ink, textAlign: "center", letterSpacing: -3, marginBottom: 40, lineHeight: 1 }}>
        Paracetamol 500mg
      </div>
      {PRICES.map((p, i) => {
        const hit = i * STAGGER;
        const s = spring({ frame: frame - hit, fps, config: { damping: 12, stiffness: 180, mass: 0.8 } });
        const x = interpolate(s, [0, 1], [1200, 0]);
        const isLast = i === PRICES.length - 1;
        const winnerPulse = isLast ? 1 + Math.sin((frame - hit) * 0.3) * 0.03 : 1;
        return (
          <div key={p.name} style={{
            transform: `translateX(${x}px) scale(${winnerPulse})`,
            background: p.best ? COLORS.primary : "#F5F5F5",
            color: p.best ? "#fff" : COLORS.ink,
            border: p.best ? "none" : `2px solid ${COLORS.border}`,
            padding: "26px 40px",
            borderRadius: 24,
            margin: "12px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: p.best ? "0 20px 60px rgba(22,163,122,0.4)" : "0 4px 12px rgba(0,0,0,0.05)",
          }}>
            <span style={{ fontSize: 56, fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: 72, fontWeight: 900, textDecoration: !p.best && p.price > 100 ? "line-through" : "none", opacity: !p.best ? 0.7 : 1 }}>
              Bs. {p.price}
            </span>
          </div>
        );
      })}
      <div style={{
        marginTop: 30,
        textAlign: "center",
        fontSize: 80,
        fontWeight: 900,
        color: COLORS.primary,
        opacity: interpolate(frame, [110, 125], [0, 1]),
        transform: `scale(${interpolate(frame, [110, 130], [0.5, 1])})`,
      }}>
        60% menos
      </div>
    </AbsoluteFill>
  );
}

function RevealScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 9, stiffness: 130 } });
  const textS = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: COLORS.bg, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <Confetti />
      <div style={{
        width: 320, height: 320, borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${COLORS.primaryGlow}, ${COLORS.primary})`,
        boxShadow: `0 0 120px ${COLORS.primaryGlow}80`,
        transform: `scale(${logoS})`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Img src={staticFile("alerta-logo.png")} style={{ width: 240, height: 240, objectFit: "contain" }} />
      </div>
      <div style={{ marginTop: 60, fontSize: 110, fontWeight: 900, color: COLORS.ink, letterSpacing: -4, transform: `translateY(${interpolate(textS, [0, 1], [50, 0])}px)`, opacity: textS, textAlign: "center" }}>
        ¡Alerta:<br/>Medicina!
      </div>
      <div style={{ marginTop: 30, fontSize: 56, fontWeight: 600, color: COLORS.muted, opacity: interpolate(frame, [40, 60], [0, 1]), textAlign: "center" }}>
        Compara precios.<br/>Ahorra siempre.
      </div>
    </AbsoluteFill>
  );
}

function DemoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phone = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const typed = Math.min(11, Math.floor(interpolate(frame, [15, 45], [0, 11], { extrapolateRight: "clamp" })));
  const text = "paracetamol".slice(0, typed);
  const showResults = frame > 50;
  const results = ["Paracetamol 500mg", "Paracetamol 1g", "Paracetamol Jarabe"];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLORS.primaryGlow} 0%, ${COLORS.bg} 55%, #FFF 100%)`, justifyContent: "center", alignItems: "center", padding: 80 }}>
      <div style={{
        width: 720, height: 1280, background: "#fff", borderRadius: 60,
        border: `12px solid ${COLORS.primary}`,
        transform: `translateY(${interpolate(phone, [0, 1], [200, 0])}px) scale(${phone})`,
        boxShadow: `0 40px 120px ${COLORS.primary}50, 0 0 0 14px #FFFFFF80`,
        padding: 50, display: "flex", flexDirection: "column",
      }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: COLORS.primary, textAlign: "center", marginBottom: 40 }}>
          ¡Alerta: Medicina!
        </div>
        <div style={{
          background: "#F5FBF7", border: `3px solid ${COLORS.primary}`,
          borderRadius: 20, padding: "24px 30px", fontSize: 48, color: COLORS.ink,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{fontSize:44,fontWeight:900,color:"#16A37A"}}>Q</span>
          <span style={{ fontWeight: 600 }}>{text}{frame % 30 < 15 ? "|" : ""}</span>
        </div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 18 }}>
          {results.map((r, i) => {
            if (!showResults) return null;
            const s = spring({ frame: frame - 50 - i * 10, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{
                background: "#F5FBF7", padding: 28, borderRadius: 18,
                fontSize: 40, fontWeight: 700, color: COLORS.ink,
                transform: `translateX(${interpolate(s, [0, 1], [400, 0])}px)`,
                opacity: s,
              }}>{r}</div>
            );
          })}
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 80, fontSize: 64, fontWeight: 900, color: COLORS.ink,
        opacity: interpolate(frame, [85, 100], [0, 1]),
        background: "#fff", padding: "16px 40px", borderRadius: 60,
        boxShadow: "0 12px 40px rgba(15,42,46,0.18)",
      }}>
        En 2 segundos
      </div>
    </AbsoluteFill>
  );
}

function FollowScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 12, stiffness: 130 } });
  const btn = spring({ frame: frame - 25, fps, config: { damping: 8, stiffness: 200 } });
  const pulse = 1 + Math.sin(frame * 0.25) * 0.04;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`, justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div style={{
        background: "#fff", borderRadius: 40, padding: 60,
        width: 880, transform: `scale(${card})`,
        boxShadow: "0 40px 120px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 30,
      }}>
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `8px solid #fff`, boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}>
          <Img src={staticFile("alerta-logo.png")} style={{ width: 150, height: 150, objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 56, fontWeight: 900, color: COLORS.ink }}>@alertamedicina</div>
        <div style={{ fontSize: 38, fontWeight: 500, color: COLORS.muted, textAlign: "center" }}>
          Te avisamos cuando bajan<br/>los precios.
        </div>
        <div style={{
          background: COLORS.primary, color: "#fff",
          padding: "30px 80px", borderRadius: 60,
          fontSize: 64, fontWeight: 900,
          transform: `scale(${btn * pulse})`,
          boxShadow: `0 20px 60px ${COLORS.primary}80`,
        }}>
          + Seguir
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 10, stiffness: 150 } });
  const underline = interpolate(frame, [20, 50], [0, 100], { extrapolateRight: "clamp" });
  const arrow = interpolate(frame, [30, 50], [-30, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryGlow} 100%)`, justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* subtle floating dots */}
      {[0,1,2,3,4,5,6,7].map((i) => {
        const x = (i * 137) % 1080;
        const y = ((i * 211) % 1700) + 80;
        const f = Math.sin((frame + i * 9) * 0.07) * 14;
        return <div key={i} style={{ position: "absolute", left: x, top: y + f, width: 14, height: 14, borderRadius: "50%", background: "#FFFFFF40" }} />;
      })}
      <div style={{ fontSize: 72, fontWeight: 700, color: "#FFFFFF", marginBottom: 30, transform: `scale(${s})`, textAlign: "center", opacity: 0.95 }}>
        Antes de comprar →
      </div>
      <div style={{ fontSize: 130, fontWeight: 900, color: "#fff", letterSpacing: -5, lineHeight: 1, textAlign: "center", transform: `scale(${s})` }}>
        alerta<br/>medicina<span style={{ color: COLORS.ink }}>.com</span>
      </div>
      <div style={{ width: `${underline}%`, maxWidth: 700, height: 10, background: "#FFFFFF", marginTop: 30, borderRadius: 8 }} />
      <div style={{ marginTop: 50, fontSize: 80, color: "#fff", transform: `translateY(${arrow}px)` }}>→</div>
    </AbsoluteFill>
  );
}

let acc = 0;
const at = (n: number) => { const v = acc; acc += n; return v; };
const HOOK = at(D.hook);
const SLAM = at(D.slam);
const REVEAL = at(D.reveal);
const DEMO = at(D.demo);
const FOLLOW = at(D.follow);
const CTA = at(D.cta);

export const DynamicVideo = () => (
  <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
    <Sequence from={HOOK} durationInFrames={D.hook}><HookScene /></Sequence>
    <Sequence from={SLAM} durationInFrames={D.slam}><SlamScene /></Sequence>
    <Sequence from={REVEAL} durationInFrames={D.reveal}><RevealScene /></Sequence>
    <Sequence from={DEMO} durationInFrames={D.demo}><DemoScene /></Sequence>
    <Sequence from={FOLLOW} durationInFrames={D.follow}><FollowScene /></Sequence>
    <Sequence from={CTA} durationInFrames={D.cta}><CTAScene /></Sequence>
  </AbsoluteFill>
);

export const DYNAMIC_DURATION = acc; // 540