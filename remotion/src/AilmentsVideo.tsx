import { AbsoluteFill, Series } from "remotion";
import { P1Headache } from "./scenes/ailments/P1Headache";
import { S1Find } from "./scenes/ailments/S1Find";
import { P2Pharmacy } from "./scenes/ailments/P2Pharmacy";
import { S2Compare } from "./scenes/ailments/S2Compare";
import { P3Mother } from "./scenes/ailments/P3Mother";
import { S3Alert } from "./scenes/ailments/S3Alert";
import { BrandClose } from "./scenes/ailments/BrandClose";

// 20s @ 30fps = 600 frames
// 3 problem-solution pairs (150f each) + brand close (150f)
export const AilmentsVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence durationInFrames={90}>
          <P1Headache />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <S1Find />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <P2Pharmacy />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <S2Compare />
        </Series.Sequence>
        <Series.Sequence durationInFrames={90}>
          <P3Mother />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <S3Alert />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <BrandClose />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};