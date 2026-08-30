/**
 * Sesión con el panel del proveedor (admin.clubestarbien.com).
 *
 * Iniciamos sesión con usuario/clave y guardamos el token de sesión en
 * memoria, reutilizándolo en cada llamada al comparador de precios
 * (/api/scraper/*). Si el proveedor responde 401/403, renovamos la sesión
 * y reintentamos una vez.
 */

const LOGIN_URL = "https://admin.clubestarbien.com/api/auth/login";
const TOKEN_TTL_MS = 50 * 60 * 1000; // renovamos con margen

/**
 * El proveedor bloquea clientes sin cabeceras de navegador
 * ("BOT_SCRAPING_BLOCKED"), así que replicamos las del comparador web.
 */
export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "es-VE,es;q=0.9,en;q=0.8",
  Referer: "https://admin.clubestarbien.com/price-comparator",
  Origin: "https://admin.clubestarbien.com",
};

let cached: { token: string; at: number } | null = null;
let inflight: Promise<string | null> | null = null;


async function login(): Promise<string | null> {
  const username = process.env["SCRAPER_LOGIN_USER"];
  const password = process.env["SCRAPER_LOGIN_PASSWORD"];
  if (!username || !password) return null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 30_000);
    const res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { ...BROWSER_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) {
      console.warn(`[scraper-session] login HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { token?: string };
    if (!json?.token) return null;
    cached = { token: json.token, at: Date.now() };
    return json.token;
  } catch (err) {
    console.warn("[scraper-session] login failed:", err);
    return null;
  }
}

/** Token de sesión vigente (inicia sesión si hace falta). */
export async function getScraperToken(force = false): Promise<string | null> {
  if (!force && cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;
  if (force) cached = null;
  if (!inflight) {
    inflight = login().finally(() => {
      inflight = null;
    });
  }
  const token = await inflight;
  // Respaldo: token estático si el login no está disponible.
  return token ?? process.env["PRICE_SCRAPER_API_TOKEN"] ?? null;
}

/** Llama al proveedor con la sesión activa, renovándola ante 401/403. */
export async function scraperFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 60_000,
): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getScraperToken(attempt > 0);
    if (!token) return null;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          ...BROWSER_HEADERS,
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
        signal: ctrl.signal,
      });
      if ((res.status === 401 || res.status === 403) && attempt === 0) continue;
      return res;
    } finally {
      clearTimeout(tid);
    }
  }
  return null;
}
