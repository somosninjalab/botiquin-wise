import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { palette, display } from "../../theme";

export { palette, display };
export { spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill };

// Subtle animated brand backdrop reused by every scene to keep continuity
export const BrandBackdrop: React.FC<{ tone?: "warm" | "cool" | "deep" }> = ({ tone = "warm" }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 30;
  const bg =
    tone === "deep"
      ? `radial-gradient(circle at ${50 + drift}% 30%, ${palette.primary} 0%, ${palette.primaryDeep} 60%, #08332A 100%)`
      : tone === "cool"
      ? `radial-gradient(circle at ${30 + drift}% 70%, ${palette.bgDeep} 0%, ${palette.bg} 60%)`
      : `radial-gradient(circle at ${60 - drift}% 30%, #FFF4E6 0%, ${palette.bg} 60%)`;
  return (
    <AbsoluteFill style={{ background: bg }}>
      <div
        style={{
          position: "absolute",
          left: -200 + Math.sin(frame / 30) * 40,
          top: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: palette.accentSoft,
          opacity: 0.35,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180 + Math.cos(frame / 35) * 40,
          bottom: -180,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: palette.primary,
          opacity: 0.22,
          filter: "blur(40px)",
        }}
      />
    </AbsoluteFill>
  );
};

export const KenBurnsImg: React.FC<{ src: string; zoomFrom?: number; zoomTo?: number; panX?: number; panY?: number }> = ({
  src,
  zoomFrom = 1,
  zoomTo = 1.12,
  panX = 0,
  panY = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1]);
  const scale = interpolate(t, [0, 1], [zoomFrom, zoomTo]);
  const tx = interpolate(t, [0, 1], [0, panX]);
  const ty = interpolate(t, [0, 1], [0, panY]);
  return (
    <img
      src={src}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(15,42,46,0) 30%, rgba(15,42,46,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const SceneFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: Math.min(inOp, outOp) }}>
      {children}
    </AbsoluteFill>
  );
};