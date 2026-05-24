import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const display = loadDisplay("normal", { weights: ["500", "700"] }).fontFamily;
export const body = loadBody("normal", { weights: ["400", "600"] }).fontFamily;

export const palette = {
  bg: "#FFF7EC",
  bgDeep: "#FFE9CC",
  ink: "#0B1B2B",
  inkSoft: "#2A3B4C",
  primary: "#0EA5A4", // teal
  primaryDeep: "#0D7A79",
  accent: "#FF5A4E", // coral
  accentSoft: "#FFB199",
  yellow: "#FFD166",
  white: "#FFFFFF",
};