import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./theme";
import { loadFont } from "@remotion/google-fonts/Inter";
import { R1Back } from "./scenes/r/R1Back";
import { R2Better } from "./scenes/r/R2Better";
import { R3Compare } from "./scenes/r/R3Compare";
import { R4CTA } from "./scenes/r/R4CTA";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

function FloatingBlobs() {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          borderRadius: "50%",
          background: COLORS.primaryGlow,
          opacity: 0.16,
          filter: "blur(110px)",
          top: -200 + Math.sin(t * 0.6) * 40,
          left: -200 + Math.cos(t * 0.4) * 40,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: COLORS.accent,
          opacity: 0.12,
          filter: "blur(110px)",
          bottom: -200 + Math.cos(t * 0.5) * 40,
          right: -200 + Math.sin(t * 0.7) * 40,
        }}
      />
    </AbsoluteFill>
  );
}

// 105 + 135 + 135 + 145 = 520, menos 3 transiciones de 16 = 472 frames (~15.7s)
export const RETURN_DURATION = 472;

export const ReturnVideo = () => (
  <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
    <FloatingBlobs />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={105}>
        <R1Back />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
      />
      <TransitionSeries.Sequence durationInFrames={135}>
        <R2Better />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
      />
      <TransitionSeries.Sequence durationInFrames={135}>
        <R3Compare />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
      />
      <TransitionSeries.Sequence durationInFrames={145}>
        <R4CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
