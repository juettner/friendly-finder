import { normalizeDeg } from "./bearing";

type OrientationLike = {
  webkitCompassHeading?: number;
  alpha?: number | null;
};

// Normalize a device-orientation reading into compass degrees (0=N, clockwise).
export function computeHeading(event: OrientationLike, screenAngle = 0): number | null {
  if (typeof event.webkitCompassHeading === "number") {
    return normalizeDeg(event.webkitCompassHeading);
  }
  if (typeof event.alpha === "number") {
    return normalizeDeg(360 - event.alpha - screenAngle);
  }
  return null;
}

// Circular low-pass filter: blend toward `next` along the shortest arc.
export function lowPass(prev: number, next: number, alpha: number): number {
  const delta = ((next - prev + 540) % 360) - 180;
  return normalizeDeg(prev + alpha * delta);
}

export function isOrientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

export async function requestHeadingPermission(): Promise<boolean> {
  const D = (window as unknown as {
    DeviceOrientationEvent?: { requestPermission?: () => Promise<"granted" | "denied"> };
  }).DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") {
    try {
      return (await D.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true; // non-iOS browsers need no explicit permission
}

// Subscribe to heading updates; returns an unsubscribe function.
export function watchHeading(onHeading: (deg: number) => void): () => void {
  let smoothed: number | null = null;
  const onEvent = (e: Event) => {
    const oe = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    const screenAngle = (screen.orientation?.angle ?? 0);
    const h = computeHeading(oe, screenAngle);
    if (h === null) return;
    smoothed = smoothed === null ? h : lowPass(smoothed, h, 0.2);
    onHeading(smoothed);
  };
  const eventName =
    "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
  window.addEventListener(eventName, onEvent, true);
  return () => window.removeEventListener(eventName, onEvent, true);
}
