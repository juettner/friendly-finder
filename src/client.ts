import type { BarsResponse, Place } from "../lib/types";

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export async function fetchNearbyPlaces(lat: number, lng: number): Promise<Place[]> {
  const res = await fetch(`/api/bars?lat=${round3(lat)}&lng=${round3(lng)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  const data = (await res.json()) as BarsResponse;
  return data.places;
}
