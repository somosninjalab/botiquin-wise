import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { AbsoluteFill } from "remotion";
import { VerticalVideo } from "./VerticalVideo";
import { ComebackVideo } from "./ComebackVideo";
import { DynamicVideo, DYNAMIC_DURATION } from "./DynamicVideo";
import { VerticalStoryVO } from "./VerticalStoryVO";
import { MilestonesStory } from "./MilestonesStory";
import { ThanksVideo, THANKS_DURATION } from "./ThanksVideo";
import { AboutVideo, ABOUT_DURATION } from "./AboutVideo";
import { ReturnVideo, RETURN_DURATION } from "./ReturnVideo";

const VerticalWrap = () => {
  // Letterbox the 1920x1080 MainVideo inside 1080x1920.
  // Scale to fit width: 1080/1920 = 0.5625 -> rendered height 607.5
  const scale = 1080 / 1920;
  return (
    <AbsoluteFill style={{ background: "#F4F8F6", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <MainVideo />
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => (
  <>
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={300}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="vertical"
    component={VerticalWrap}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="vertical-story"
    component={VerticalVideo}
    durationInFrames={638}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="vertical-story-vo"
    component={VerticalStoryVO}
    durationInFrames={638}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="comeback"
    component={ComebackVideo}
    durationInFrames={913}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="dynamic"
    component={DynamicVideo}
    durationInFrames={DYNAMIC_DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="milestones-story"
    component={MilestonesStory}
    durationInFrames={600}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="thanks-story"
    component={ThanksVideo}
    durationInFrames={THANKS_DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="about-15s"
    component={AboutVideo}
    durationInFrames={ABOUT_DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="return-story"
    component={ReturnVideo}
    durationInFrames={RETURN_DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
  </>
);