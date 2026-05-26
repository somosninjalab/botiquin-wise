import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { VerticalVideo } from "./VerticalVideo";

export const VerticalStoryVO = () => {
  return (
    <AbsoluteFill>
      <VerticalVideo />
      {/* Background music bed, soft */}
      <Audio src={staticFile("audio/music.mp3")} volume={0.18} />
      {/* Whoosh on hook entry */}
      <Sequence from={0}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.6} />
      </Sequence>
      {/* Whoosh on brand scene (frame ~210) */}
      <Sequence from={210}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.55} />
      </Sequence>
      {/* Ding on winner reveal (frame ~440) */}
      <Sequence from={440}>
        <Audio src={staticFile("audio/ding.mp3")} volume={0.5} />
      </Sequence>
      {/* Ding on CTA */}
      <Sequence from={560}>
        <Audio src={staticFile("audio/ding.mp3")} volume={0.5} />
      </Sequence>
      {/* Voice over, starts at 6 frames in */}
      <Sequence from={6}>
        <Audio src={staticFile("audio/vo_fit.mp3")} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};