// Approximate coordinates (lat, lng) for the main Venezuelan cities and capitals.
// Used to render heat maps from text-only city fields stored in `profiles` and `search_events`.

export type LatLng = { lat: number; lng: number };

const RAW: Record<string, LatLng> = {
  caracas: { lat: 10.4806, lng: -66.9036 },
  maracaibo: { lat: 10.6427, lng: -71.6125 },
  valencia: { lat: 10.1621, lng: -68.0078 },
  barquisimeto: { lat: 10.0647, lng: -69.3467 },
  maracay: { lat: 10.2469, lng: -67.5958 },
  "ciudad guayana": { lat: 8.3533, lng: -62.6406 },
  "puerto ordaz": { lat: 8.3833, lng: -62.65 },
  "san cristobal": { lat: 7.7669, lng: -72.225 },
  "san cristóbal": { lat: 7.7669, lng: -72.225 },
  maturin: { lat: 9.7457, lng: -63.1832 },
  maturín: { lat: 9.7457, lng: -63.1832 },
  barcelona: { lat: 10.1333, lng: -64.6833 },
  "puerto la cruz": { lat: 10.2167, lng: -64.6167 },
  cumana: { lat: 10.4546, lng: -64.1671 },
  cumaná: { lat: 10.4546, lng: -64.1671 },
  merida: { lat: 8.5897, lng: -71.1561 },
  mérida: { lat: 8.5897, lng: -71.1561 },
  "ciudad bolivar": { lat: 8.1297, lng: -63.55 },
  "ciudad bolívar": { lat: 8.1297, lng: -63.55 },
  barinas: { lat: 8.6231, lng: -70.2078 },
  "san fernando de apure": { lat: 7.8939, lng: -67.4639 },
  "san fernando": { lat: 7.8939, lng: -67.4639 },
  acarigua: { lat: 9.55, lng: -69.2 },
  araure: { lat: 9.5833, lng: -69.2333 },
  guanare: { lat: 9.0422, lng: -69.7411 },
  coro: { lat: 11.4045, lng: -69.6739 },
  "punto fijo": { lat: 11.7022, lng: -70.2061 },
  "puerto cabello": { lat: 10.4806, lng: -68.0125 },
  "los teques": { lat: 10.3429, lng: -67.0438 },
  guarenas: { lat: 10.4683, lng: -66.6175 },
  guatire: { lat: 10.4719, lng: -66.5403 },
  "la guaira": { lat: 10.6, lng: -66.9333 },
  catia: { lat: 10.5167, lng: -66.95 },
  petare: { lat: 10.4769, lng: -66.8136 },
  "el tigre": { lat: 8.8839, lng: -64.2531 },
  anaco: { lat: 9.4258, lng: -64.4631 },
  porlamar: { lat: 10.9572, lng: -63.85 },
  "la asuncion": { lat: 11.0331, lng: -63.86 },
  "la asunción": { lat: 11.0331, lng: -63.86 },
  "puerto ayacucho": { lat: 5.6628, lng: -67.6303 },
  tucupita: { lat: 9.0617, lng: -62.0436 },
  carupano: { lat: 10.6678, lng: -63.2511 },
  carúpano: { lat: 10.6678, lng: -63.2511 },
  valera: { lat: 9.3147, lng: -70.6063 },
  trujillo: { lat: 9.3667, lng: -70.4333 },
  "el vigia": { lat: 8.6231, lng: -71.6553 },
  "el vigía": { lat: 8.6231, lng: -71.6553 },
  cabimas: { lat: 10.3833, lng: -71.45 },
  "ciudad ojeda": { lat: 10.2, lng: -71.3 },
  "san carlos": { lat: 9.6597, lng: -68.5856 },
  tinaquillo: { lat: 9.9167, lng: -68.3 },
  yaritagua: { lat: 10.0833, lng: -69.1167 },
  cagua: { lat: 10.1864, lng: -67.4581 },
  turmero: { lat: 10.2289, lng: -67.4733 },
  "la victoria": { lat: 10.2333, lng: -67.3333 },
  villa: { lat: 10.1864, lng: -67.4581 },
  "villa de cura": { lat: 10.0394, lng: -67.4894 },
  ocumare: { lat: 10.1167, lng: -66.7833 },
  "san juan de los morros": { lat: 9.9089, lng: -67.3536 },
  calabozo: { lat: 8.9239, lng: -67.4239 },
  valle: { lat: 9.2169, lng: -66.0064 },
  "valle de la pascua": { lat: 9.2169, lng: -66.0064 },
  zaraza: { lat: 9.3486, lng: -65.3247 },
  upata: { lat: 8.0167, lng: -62.4 },
  caripe: { lat: 10.1989, lng: -63.4881 },
  carora: { lat: 10.1789, lng: -70.0786 },
  duaca: { lat: 10.2625, lng: -69.1431 },
  quibor: { lat: 9.9233, lng: -69.6233 },
  altagracia: { lat: 10.7167, lng: -71.5333 },
  "altagracia de orituco": { lat: 9.8694, lng: -66.3789 },
  rubio: { lat: 7.7, lng: -72.35 },
  "san antonio del tachira": { lat: 7.8161, lng: -72.4458 },
  "san antonio del táchira": { lat: 7.8161, lng: -72.4458 },
  "san juan": { lat: 9.9089, lng: -67.3536 },
  charallave: { lat: 10.2406, lng: -66.8511 },
  "santa teresa": { lat: 10.2347, lng: -66.6692 },
  "santa teresa del tuy": { lat: 10.2347, lng: -66.6692 },
  "ocumare del tuy": { lat: 10.1167, lng: -66.7833 },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED: Record<string, LatLng> = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [normalize(k), v]),
);

export function lookupCityLatLng(city: string | null | undefined): LatLng | null {
  if (!city) return null;
  const key = normalize(city);
  if (NORMALIZED[key]) return NORMALIZED[key];
  // try first token (e.g. "Caracas, Distrito Capital" → "caracas")
  const head = key.split(",")[0].trim();
  if (NORMALIZED[head]) return NORMALIZED[head];
  return null;
}

export const VENEZUELA_CENTER: LatLng = { lat: 7.5, lng: -66.0 };