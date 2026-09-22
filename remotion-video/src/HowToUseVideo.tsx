import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { How1Hook } from "./scenes/howto/How1Hook";
import { How2Open } from "./scenes/howto/How2Open";
import { How3Search } from "./scenes/howto/How3Search";
import { How4Best } from "./scenes/howto/How4Best";
import { How5Close } from "./scenes/howto/How5Close";

export const HOW_TO_USE_DURATION = 450;
const transition = springTiming({ config: { damping: 200 }, durationInFrames: 10 });

export const HowToUseVideo = () => (
  <AbsoluteFill>
    <Audio src={staticFile("audio/music.mp3")} volume={0.16} />
    {[0, 73, 159, 247].map((from, index) => (
      <Sequence key={from} from={from} durationInFrames={24} premountFor={30}>
        <Audio src={staticFile(index === 3 ? "audio/ding.mp3" : "audio/whoosh.mp3")} volume={0.62} />
      </Sequence>
    ))}
    <Sequence from={216} durationInFrames={20} premountFor={30}>
      <Audio src={staticFile("audio/sfx_tick.mp3")} volume={0.58} />
    </Sequence>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={78}><How1Hook /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={96}><How2Open /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={98}><How3Search /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={105}><How4Best /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={transition} />
      <TransitionSeries.Sequence durationInFrames={113}><How5Close /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);