import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { ExplainerVideo } from "./ExplainerVideo";
import { SickVideo } from "./SickVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
    <Composition
      id="main"
      component={MainVideo}
      durationInFrames={599}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="explainer"
      component={ExplainerVideo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="sick"
      component={SickVideo}
      durationInFrames={750}
      fps={30}
      width={1080}
      height={1920}
    />
    </>
  );
};