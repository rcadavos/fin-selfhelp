import Svg, { Path } from "react-native-svg";

import { GOOGLE_MARK_PATHS } from "@shared/brand-marks";

export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {GOOGLE_MARK_PATHS.map(({ fill, d }) => (
        <Path key={fill} fill={fill} d={d} />
      ))}
    </Svg>
  );
}
