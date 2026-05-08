import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene1Hero } from "./scenes/Scene1Hero";
import { Scene2Compare } from "./scenes/Scene2Compare";
import { Scene3Winner } from "./scenes/Scene3Winner";
import { COLORS } from "./theme";
import { loadFont } from "@remotion/google-fonts/Inter";

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
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: COLORS.primaryGlow,
          opacity: 0.18,
          filter: "blur(120px)",
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
          opacity: 0.14,
          filter: "blur(120px)",
          bottom: -180 + Math.cos(t * 0.5) * 30,
          right: -180 + Math.sin(t * 0.7) * 30,
        }}
      />
    </AbsoluteFill>
  );
}

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
      <FloatingBlobs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={95}>
          <Scene1Hero />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene2Compare />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene3Winner />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export { interpolate };