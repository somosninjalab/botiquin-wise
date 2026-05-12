// Voyage AI embedding helper. Server-only.
// Uses voyage-3-lite (512 dims) — matches medications.embedding vector(512).

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-lite";

export async function embedTexts(
  texts: string[],
  inputType: "query" | "document" = "document",
): Promise<number[][]> {
  if (!texts.length) return [];
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not configured");

  // Voyage accepts up to 128 inputs per request; batch defensively.
  const out: number[][] = [];
  const BATCH = 64;
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map((t) => (t || " ").slice(0, 8000));
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: slice, model: MODEL, input_type: inputType }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Voyage API ${res.status}: ${txt}`);
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    for (const d of json.data) out.push(d.embedding);
  }
  return out;
}

export async function embedOne(
  text: string,
  inputType: "query" | "document" = "query",
): Promise<number[]> {
  const [v] = await embedTexts([text], inputType);
  return v;
}

/** Composes the canonical text used for medication embeddings. */
export function buildMedicationEmbeddingText(m: {
  name: string;
  active_ingredient: string;
  presentation?: string | null;
  category?: string | null;
  indication?: string | null;
  indication_es?: string | null;
  manufacturer?: string | null;
  brand_names?: string[] | null;
  symptoms_text?: string | null;
  tag_labels?: string[] | null;
}): string {
  const parts = [
    m.name,
    m.active_ingredient,
    m.presentation ?? "",
    m.category ?? "",
    m.indication_es ?? m.indication ?? "",
    (m.brand_names ?? []).join(" "),
    m.symptoms_text ?? "",
    (m.tag_labels ?? []).join(" "),
    m.manufacturer ?? "",
  ].filter(Boolean);
  return parts.join(" • ").slice(0, 8000);
}