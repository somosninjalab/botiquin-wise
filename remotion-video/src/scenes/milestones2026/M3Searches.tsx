import { MetricScene } from "./shared";
import { COLORS } from "../../theme";

export const M3Searches = () => (
  <MetricScene eyebrow="Decisiones más inteligentes" value="+130 MIL" label="medicamentos buscados" accent={COLORS.accent}>
    <div style={{ marginTop: 58, display: "flex", alignItems: "center", gap: 24, color: COLORS.muted, fontSize: 34, fontWeight: 800 }}>
      <div style={{ width: 64, height: 64, border: `9px solid ${COLORS.accent}`, borderRadius: "50%", position: "relative" }}>
        <div style={{ position: "absolute", width: 34, height: 9, background: COLORS.accent, right: -26, bottom: -12, transform: "rotate(45deg)", borderRadius: 9 }} />
      </div>
      Comparar antes de comprar
    </div>
  </MetricScene>
);
