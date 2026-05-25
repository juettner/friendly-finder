import type { Place } from "../lib/types";

export function googleMapsUrl(place: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`;
}

export function appleMapsUrl(place: Place): string {
  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&dirflg=w`;
}

export function isIOS(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

export function directionsUrl(place: Place, userAgent: string): string {
  return isIOS(userAgent) ? appleMapsUrl(place) : googleMapsUrl(place);
}
