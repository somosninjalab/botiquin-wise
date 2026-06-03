import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";
import { AboutBrand } from "./scenes/about/AboutBrand";
import { AboutWhat } from "./scenes/about/AboutWhat";
import { AboutMilestones } from "./scenes/about/AboutMilestones";
import { AboutThanks } from "./scenes/about/AboutThanks";
import { AboutCTA } from "./scenes/about/AboutCTA";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

// 15s @ 30fps = 450 frames
// sequences: 75 + 100 + 160 + 80 + 95 = 510
// 4 transitions x 15f overlap = 60 -> 450 total
export const ABOUT_DURATION = 450;

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
          opacity: 0.14,
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
          opacity: 0.11,
          filter: "blur(110px)",
          bottom: -200 + Math.cos(t * 0.5) * 40,
          right: -200 + Math.sin(t * 0.7) * 40,
        }}
      />
    </AbsoluteFill>
  );
}

export const AboutVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
      <FloatingBlobs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={75}>
          <AboutBrand />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <AboutWhat />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <AboutMilestones />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={80}>
          <AboutThanks />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={95}>
          <AboutCTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};