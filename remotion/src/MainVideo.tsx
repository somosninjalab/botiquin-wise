import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Problem1 } from "./scenes/Scene2Problem1";
import { Scene3Problem2 } from "./scenes/Scene3Problem2";
import { Scene4Solution } from "./scenes/Scene4Solution";
import { Scene5Close } from "./scenes/Scene5Close";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={105}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene2Problem1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-bottom-right" })}
          timing={linearTiming({ durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={135}>
          <Scene3Problem2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Solution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5Close />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};