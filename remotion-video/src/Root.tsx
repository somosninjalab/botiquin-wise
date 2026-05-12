import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { AbsoluteFill } from "remotion";

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
  </>
);