import { useEffect, useState } from "react";

export const MOBILE_VALIDATION_WIDTHS = [360, 390, 412, 430] as const;

export interface MobileLayoutProfile {
  density: "compact" | "comfortable";
  contentPadding: 12 | 16;
  minimumTouchTarget: 48;
  columns: 1;
  showBottomNavLabels: boolean;
}

export function getMobileLayoutProfile(width: number): MobileLayoutProfile {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 360;
  const compact = safeWidth < 390;
  return {
    density: compact ? "compact" : "comfortable",
    contentPadding: compact ? 12 : 16,
    minimumTouchTarget: 48,
    columns: 1,
    showBottomNavLabels: safeWidth >= 375,
  };
}

export function useMobileLayoutProfile(): MobileLayoutProfile {
  const [profile, setProfile] = useState(() =>
    getMobileLayoutProfile(typeof window === "undefined" ? 390 : window.innerWidth),
  );

  useEffect(() => {
    const update = () => setProfile(getMobileLayoutProfile(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return profile;
}
