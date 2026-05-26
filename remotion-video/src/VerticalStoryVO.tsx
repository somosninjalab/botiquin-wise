import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { VerticalVideo } from "./VerticalVideo";

// Scene timeline (durations sum minus overlaps):
// Scene1Hook    0   - 95
// Scene2Problem 95  - 215
// Scene3Brand   215 - 310
// Scene4Compare 310 - 460
// Scene5Winner  460 - 590
// Scene6CTA     590 - 638
export const VerticalStoryVO = () => {
  return (
    <AbsoluteFill>
      <VerticalVideo />

      {/* Background music bed */}
      <Audio src={staticFile("audio/music.mp3")} volume={0.16} />

      {/* Scene 1: hook impact */}
      <Sequence from={0}>
        <Audio src={staticFile("audio/sfx_boom.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={8}>
        <Audio src={staticFile("audio/sfx_sparkle.mp3")} volume={0.4} />
      </Sequence>

      {/* Scene 2: problem — ticking comparison */}
      <Sequence from={95}>
        <Audio src={staticFile("audio/sfx_swoosh.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={120}>
        <Audio src={staticFile("audio/sfx_tick.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={150}>
        <Audio src={staticFile("audio/sfx_tick.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={180}>
        <Audio src={staticFile("audio/sfx_tick.mp3")} volume={0.5} />
      </Sequence>

      {/* Scene 3: brand reveal */}
      <Sequence from={215}>
        <Audio src={staticFile("audio/sfx_swoosh.mp3")} volume={0.6} />
      </Sequence>
      <Sequence from={230}>
        <Audio src={staticFile("audio/sfx_sparkle.mp3")} volume={0.55} />
      </Sequence>

      {/* Scene 4: comparison pops */}
      <Sequence from={310}>
        <Audio src={staticFile("audio/sfx_swoosh.mp3")} volume={0.45} />
      </Sequence>
      <Sequence from={335}>
        <Audio src={staticFile("audio/sfx_pop.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={370}>
        <Audio src={staticFile("audio/sfx_pop.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={405}>
        <Audio src={staticFile("audio/sfx_pop.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={435}>
        <Audio src={staticFile("audio/sfx_pop.mp3")} volume={0.55} />
      </Sequence>

      {/* Scene 5: winner reveal — cash + ding */}
      <Sequence from={460}>
        <Audio src={staticFile("audio/sfx_cash.mp3")} volume={0.6} />
      </Sequence>
      <Sequence from={475}>
        <Audio src={staticFile("audio/ding.mp3")} volume={0.55} />
      </Sequence>
      <Sequence from={520}>
        <Audio src={staticFile("audio/sfx_sparkle.mp3")} volume={0.5} />
      </Sequence>

      {/* Scene 6: CTA */}
      <Sequence from={590}>
        <Audio src={staticFile("audio/sfx_swoosh.mp3")} volume={0.5} />
      </Sequence>
      <Sequence from={605}>
        <Audio src={staticFile("audio/ding.mp3")} volume={0.6} />
      </Sequence>

      {/* Voice over */}
      <Sequence from={6}>
        <Audio src={staticFile("audio/vo_fit.mp3")} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};