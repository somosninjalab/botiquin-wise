import { useEffect, useState } from "react";

/**
 * Obtiene la tasa oficial BCV (VES por 1 USD).
 * Cachea en sessionStorage por 1 hora.
 */
export function useBcvRate() {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    const cached = typeof window !== "undefined" ? sessionStorage.getItem("bcv_rate") : null;
    if (cached) {
      try {
        const { rate: r, ts } = JSON.parse(cached);
        if (Date.now() - ts < 60 * 60 * 1000 && typeof r === "number") {
          setRate(r);
          return;
        }
      } catch {}
    }
    (async () => {
      try {
        const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
        const j = await res.json();
        const r = Number(j?.promedio);
        if (Number.isFinite(r) && r > 0) {
          setRate(r);
          sessionStorage.setItem("bcv_rate", JSON.stringify({ rate: r, ts: Date.now() }));
        }
      } catch (e) {
        console.error("BCV rate fetch failed", e);
      }
    })();
  }, []);

  return rate;
}