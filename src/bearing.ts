import type { LatLng } from "../lib/types";

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function initialBearingDeg(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

// Degrees to rotate a needle so it points at `targetBearing` while the device faces `deviceHeading`.
export function relativeAngle(targetBearing: number, deviceHeading: number): number {
  return normalizeDeg(targetBearing - deviceHeading);
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function degToCardinal(deg: number): string {
  return CARDINALS[Math.round(normalizeDeg(deg) / 45) % 8];
}
