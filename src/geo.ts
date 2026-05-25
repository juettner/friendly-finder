import type { LatLng } from "../lib/types";

export type GeoErrorCode = "denied" | "unavailable" | "timeout";

export class GeoError extends Error {
  constructor(public code: GeoErrorCode, message: string) {
    super(message);
    this.name = "GeoError";
  }
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeoError("unavailable", "Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const code: GeoErrorCode =
          err.code === err.PERMISSION_DENIED ? "denied"
          : err.code === err.TIMEOUT ? "timeout"
          : "unavailable";
        reject(new GeoError(code, err.message));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  });
}
