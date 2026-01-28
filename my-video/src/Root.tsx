import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { UGCComposition, getDefaultUGCProps, calculateTotalDuration } from "./compositions/UGCComposition";
import { AutopilotComposition, getDefaultAutopilotProps, calculateAutopilotTotalDuration } from "./compositions/AutopilotComposition";
import { UGC_VIDEO_CONFIG } from "./types/UGCSceneProps";
import { AUTOPILOT_VIDEO_CONFIG } from "./types/AutopilotSceneProps";

// Default props for UGC preview
const defaultUGCProps = getDefaultUGCProps();
const ugcDuration = calculateTotalDuration(defaultUGCProps.sceneDurations);

// Default props for Autopilot preview
const defaultAutopilotProps = getDefaultAutopilotProps();
const autopilotDuration = calculateAutopilotTotalDuration(defaultAutopilotProps.sceneDurations);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original composition (for backwards compatibility) */}
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />

      {/* UGC Video Composition (Portrait 9:16, 30-45s) */}
      <Composition
        id="UGCVideo"
        component={UGCComposition}
        durationInFrames={ugcDuration}
        fps={UGC_VIDEO_CONFIG.fps}
        width={UGC_VIDEO_CONFIG.width}
        height={UGC_VIDEO_CONFIG.height}
        defaultProps={defaultUGCProps}
      />

      {/* Autopilot Video Composition (Portrait 9:16, 60-75s) */}
      <Composition
        id="AutopilotVideo"
        component={AutopilotComposition}
        durationInFrames={autopilotDuration}
        fps={AUTOPILOT_VIDEO_CONFIG.fps}
        width={AUTOPILOT_VIDEO_CONFIG.width}
        height={AUTOPILOT_VIDEO_CONFIG.height}
        defaultProps={defaultAutopilotProps}
      />
    </>
  );
};
