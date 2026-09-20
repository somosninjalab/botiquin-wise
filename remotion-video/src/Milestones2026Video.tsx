import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "./theme";
import { M1Hook } from "./scenes/milestones2026/M1Hook";
import { M2People } from "./scenes/milestones2026/M2People";
import { M3Searches } from "./scenes/milestones2026/M3Searches";
import { M4Savings } from "./scenes/milestones2026/M4Savings";
import { M5Close } from "./scenes/milestones2026/M5Close";

const { fontFamily } = loadFont("normal", {
  weights: ["600", "700", "800", "900"],
  subsets: ["latin"],
});

export const MILESTONES_2026_DURATION = 444;
const transition = springTiming({ config: { damping: 200 }, durationInFrames: 12 });

export const Milestones2026Video = () => (
  <AbsoluteFill style={{ background: COLORS.bg, fontFamily }}>
    <Audio src={staticFile("audio/music.mp3")} volume={0.2} />
    {[0, 72, 144, 216, 288].map((from, index) => (
      <Sequence key={from} from={from} durationInFrames={20}>
        <Audio src={staticFile(index === 4 ? "audio/ding.mp3" : index === 3 ? "audio/sfx_cash.mp3" : "audio/whoosh.mp3")} volume={index === 3 ? 0.48 : 0.62} />
      </Sequence>
    ))}
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={76}><M1Hook /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={76}><M2People /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={76}><M3Searches /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={76}><M4Savings /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={188}><M5Close /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
