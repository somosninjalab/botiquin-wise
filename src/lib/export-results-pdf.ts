import type { MedicationRow, PriceRow } from "@/lib/medications";
import { displayPrice } from "@/lib/medications";

export type PdfPharmacyInfo = { name: string };

const BRAND = { r: 46, g: 158, b: 119 }; // verde de marca (primary)
const TEXT = { r: 40, g: 48, b: 56 };
const MUTED = { r: 120, g: 128, b: 136 };

/**
 * Genera un PDF con los resultados de la búsqueda, incluyendo enlaces
 * clicables de compra por farmacia. Corre 100% en el navegador (jsPDF).
 */
export async function exportSearchResultsPdf(opts: {
  query: string;
  grouped: [string, MedicationRow[]][];
  latestByMedPharm: Map<string, PriceRow>;
  pharmaciesMap: Record<string, string>;
  bcvRate: number | null;
}) {
  const { query, grouped, latestByMedPharm, pharmaciesMap, bcvRate } = opts;
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 0;

  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text(
        `Alerta Medicina · alertamedicina.com · Página ${i} de ${pages}`,
        margin,
        pageH - 20,
      );
      doc.textWithLink("alertamedicina.com", pageW - margin - 90, pageH - 20, {
        url: "https://alertamedicina.com",
      });
    }
  };

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - 50) {
      doc.addPage();
      y = 60;
    }
  };

  // Header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Alerta Medicina", margin, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fecha = new Date().toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" });
  doc.text(
    query ? `Resultados para: ${query}` : "Resultados de búsqueda",
    margin,
    48,
  );
  doc.setFontSize(9);
  doc.text(fecha, pageW - margin, 30, { align: "right" });
  y = 90;

  doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
  doc.setFontSize(9);
  if (bcvRate) {
    doc.text(
      `Tasa BCV de referencia: Bs. ${bcvRate.toFixed(2)} / USD. Precios sujetos a disponibilidad en cada farmacia.`,
      margin,
      y,
    );
    y += 14;
  }

  let included = 0;
  for (const [category, meds] of grouped) {
    newPageIfNeeded(60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(String(category), margin, y);
    y += 8;
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 14;

    for (const med of meds) {
      const rows: { pharmacy: string; price: string; secondary?: string; url?: string; inStock: boolean }[] = [];
      for (const [pharmId, name] of Object.entries(pharmaciesMap)) {
        const p = latestByMedPharm.get(`${med.id}|${pharmId}`);
        if (!p) continue;
        const d = displayPrice(Number(p.price), p.currency, bcvRate);
        rows.push({
          pharmacy: name,
          price: d.primary,
          secondary: d.secondary,
          url: p.product_url ?? undefined,
          inStock: p.in_stock,
        });
      }
      if (!rows.length) continue;
      included++;

      newPageIfNeeded(40 + rows.length * 16);
      doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(med.name, pageW - margin * 2), margin, y);
      y += 14;

      for (const r of rows) {
        newPageIfNeeded(18);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
        doc.text(r.pharmacy, margin + 8, y);
        const priceText = r.secondary ? `${r.price} (${r.secondary})` : r.price;
        doc.text(r.inStock ? priceText : `${priceText} — No disponible`, margin + 170, y);
        if (r.url) {
          doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
          doc.setFont("helvetica", "bold");
          doc.textWithLink("Comprar »", pageW - margin - 55, y, { url: r.url });
          doc.setFont("helvetica", "normal");
        }
        y += 15;
      }
      y += 8;
    }
  }

  if (!included) throw new Error("empty");

  // Disclaimer
  newPageIfNeeded(40);
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    doc.splitTextToSize(
      "Los precios y la disponibilidad son reportados por las farmacias al momento de la consulta y pueden variar. Alerta Medicina no vende medicamentos; te conecta con la farmacia para completar tu compra.",
      pageW - margin * 2,
    ),
    margin,
    y + 10,
  );

  addFooter();
  const slug = (query || "resultados").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  doc.save(`alerta-medicina-${slug}.pdf`);
}
