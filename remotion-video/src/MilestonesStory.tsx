import { AbsoluteFill, useCurrentFrame } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";
import { Scene1Hook } from "./scenes/v/Scene1Hook";
import { SceneProblemsList } from "./scenes/v/SceneProblemsList";
import { Scene3Brand } from "./scenes/v/Scene3Brand";
import { SceneMilestones } from "./scenes/v/SceneMilestones";
import { Scene6CTA } from "./scenes/v/Scene6CTA";

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

// 90 + 130 + 90 + 200 + 150 = 660  -  4 transitions x 15f = 60 overlap  =>  600 frames (20s @ 30fps)
export const MilestonesStory = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
      <FloatingBlobs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneProblemsList />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene3Brand />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={200}>
          <SceneMilestones />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};