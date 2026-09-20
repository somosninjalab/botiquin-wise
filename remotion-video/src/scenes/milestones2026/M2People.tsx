import { MetricScene } from "./shared";
import { COLORS } from "../../theme";

export const M2People = () => (
  <MetricScene eyebrow="Una comunidad que crece" value="+10 MIL" label="personas registradas" accent={COLORS.primary}>
    <div style={{ marginTop: 60, display: "flex", gap: 12 }}>
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} style={{ width: 46, height: 46, borderRadius: "50%", background: index < 9 ? COLORS.primary : COLORS.border }} />
      ))}
    </div>
  </MetricScene>
);
