import { interpolate, useCurrentFrame } from "remotion";
import { MetricScene } from "./shared";
import { COLORS } from "../../theme";

export const M4Savings = () => {
  const frame = useCurrentFrame();
  const bar = interpolate(frame, [10, 48], [0.08, 1], { extrapolateRight: "clamp" });
  return (
    <MetricScene eyebrow="Ahorro real" value="+$1 MILLÓN" label="de dólares ahorrados" accent={COLORS.primary}>
      <div style={{ marginTop: 58, width: "100%", height: 32, background: COLORS.border, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${bar * 100}%`, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`, borderRadius: 20 }} />
      </div>
    </MetricScene>
  );
};
