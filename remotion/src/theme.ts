import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["500", "700"] }).fontFamily;
export const body = loadBody("normal", { weights: ["400", "600"] }).fontFamily;

export const palette = {
  // Alerta Medicina brand palette (matches src/styles.css tokens)
  bg: "#F5FBF7",
  bgDeep: "#D7ECE5",
  ink: "#0F2A2E",
  inkSoft: "#2A4A4D",
  primary: "#16A37A", // brand teal-green
  primaryDeep: "#0F7A5B",
  accent: "#F08A4B", // warm orange
  accentSoft: "#F6B98A",
  yellow: "#F0D08A",
  white: "#FFFFFF",
};