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

      {/* Voice over */}
      <Sequence from={6}>
        <Audio src={staticFile("audio/vo_fit.mp3")} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};