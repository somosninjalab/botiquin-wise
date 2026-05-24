import { AbsoluteFill, useCurrentFrame } from "remotion";
import { palette } from "../theme";

export const Background: React.FC<{ tone?: "warm" | "cool" }> = ({ tone = "warm" }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 30;
  const colorA = tone === "warm" ? palette.bg : "#E8F6F6";
  const colorB = tone === "warm" ? palette.bgDeep : "#BEE7E6";
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${50 + drift}% ${30 - drift / 2}%, ${colorB} 0%, ${colorA} 55%, ${colorA} 100%)`,
      }}
    />
  );
};

export const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      opacity: 0.06,
      mixBlendMode: "multiply",
      background:
        "repeating-radial-gradient(circle at 30% 20%, #0B1B2B 0 1px, transparent 1px 4px)",
      pointerEvents: "none",
    }}
  />
);

export const FloatingBlob: React.FC<{
  color: string;
  x: number;
  y: number;
  size: number;
  phase?: number;
}> = ({ color, x, y, size, phase = 0 }) => {
  const frame = useCurrentFrame();
  const dx = Math.sin((frame + phase) / 45) * 25;
  const dy = Math.cos((frame + phase) / 50) * 30;
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(40px)",
        opacity: 0.55,
      }}
    />
  );
};