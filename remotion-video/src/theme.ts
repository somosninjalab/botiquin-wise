// Alerta Medicina brand palette (converted from oklch tokens in src/styles.css)
export const COLORS = {
  bg: "#F5FBF7",
  card: "#FFFFFF",
  ink: "#0F2A2E",
  muted: "#5C7A78",
  primary: "#16A37A",
  primaryGlow: "#3FD3A2",
  accent: "#F08A4B",
  border: "#D7ECE5",
};

export const GRADIENT_HERO =
  "linear-gradient(135deg, #16A37A 0%, #3FD3A2 50%, #F0D08A 100%)";

export const PHARMACIES = [
  { name: "Farmatodo", slug: "farmatodo", price: "Bs. 240", color: "#E30613" },
  { name: "Locatel", slug: "locatel", price: "Bs. 198", color: "#0066B3" },
  { name: "SAAS", slug: "saas", price: "Bs. 96", color: "#1E9E3E", best: true },
  { name: "Farmago", slug: "farmago", price: "Bs. 215", color: "#00A99D" },
  { name: "GoPharma", slug: "gopharma", price: "Bs. 182", color: "#0EA5E9" },
] as const;