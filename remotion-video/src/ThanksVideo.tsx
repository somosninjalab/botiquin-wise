import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./theme";
import { loadFont } from "@remotion/google-fonts/Inter";
import { T1Hook } from "./scenes/t/T1Hook";
import { T2Problems } from "./scenes/t/T2Problems";
import { T3Thanks } from "./scenes/t/T3Thanks";
import { T4Honest } from "./scenes/t/T4Honest";
import { T5CTA } from "./scenes/t/T5CTA";

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
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: COLORS.primaryGlow,
          opacity: 0.16,
          filter: "blur(110px)",
          top: -180 + Math.sin(t * 0.6) * 40,
          left: -180 + Math.cos(t * 0.4) * 40,
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

// Durations: 100 + 130 + 160 + 95 + 130 = 615 frames
// Transitions overlap 4 x 16 = 64 frames -> total ~551 frames = 18.3s
export const THANKS_DURATION = 551;

export const ThanksVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
      <FloatingBlobs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}>
          <T1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <T2Problems />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <T3Thanks />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
        />
        <TransitionSeries.Sequence durationInFrames={95}>
          <T4Honest />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 16 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <T5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};