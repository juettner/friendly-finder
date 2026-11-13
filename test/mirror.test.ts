import { describe, it, expect } from "vitest";
import {
  buildSnapshot,
  cellHalfDiagonalMiles,
  crawlRegion,
  gridCells,
  MirrorAbortError,
  PAGE_SIZE,
  RESULT_CAP,
  SEARCH_RADIUS_MILES,
  type FetchPage,
} from "../lib/mirror";
import type { Place, Region } from "../lib/types";

const MILES_PER_DEG_LAT = 69.0;
const milesPerDegLng = (lat: number) => MILES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

function milesBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return Math.hypot((aLat - bLat) * MILES_PER_DEG_LAT, (aLng - bLng) * milesPerDegLng(aLat));
}

function place(i: number, lat: number, lng: number): Omit<Place, "distanceMiles"> {
  return { name: `PLACE ${i}`, type: "bar", lat, lng, address: `${i} MAIN ST`, city: "X", state: "MN", zip: "55401", phone: "" };
}

/** A stand-in upstream with the real one's rules: 10-mile radius, 50 per page, capped at 400. */
function fakeUpstream(world: Omit<Place, "distanceMiles">[]) {
  const calls: Array<{ lat: number; lng: number; page: number }> = [];
  const fetchPage: FetchPage = async (lat, lng, page) => {
    calls.push({ lat, lng, page });
    const inRange = world
      .map((p) => ({ ...p, distanceMiles: Math.round(milesBetween(lat, lng, p.lat, p.lng) * 10) / 10 }))
      .filter((p) => p.distanceMiles <= SEARCH_RADIUS_MILES)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, RESULT_CAP);
    return { total: inRange.length, places: inRange.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) };
  };
  return { fetchPage, calls };
}

const region: Region = { name: "test", south: 44.7, west: -93.6, north: 45.2, east: -92.9 };
const quiet = { delayMs: 0, sleep: async () => {} };

/** Deterministic pseudo-random numbers, so the test world is the same every run. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

describe("gridCells", () => {
  it("tiles the whole region with cells a single search can cover", () => {
    const cells = gridCells(region, 12);
    expect(Math.min(...cells.map((c) => c.south))).toBeCloseTo(region.south);
    expect(Math.max(...cells.map((c) => c.north))).toBeCloseTo(region.north);
    expect(Math.min(...cells.map((c) => c.west))).toBeCloseTo(region.west);
    expect(Math.max(...cells.map((c) => c.east))).toBeCloseTo(region.east);
    for (const c of cells) expect(cellHalfDiagonalMiles(c)).toBeLessThan(SEARCH_RADIUS_MILES);
  });
});

describe("crawlRegion", () => {
  it("finds every place in a sparse region, each exactly once", async () => {
    const rand = rng(1);
    const world = Array.from({ length: 300 }, (_, i) =>
      place(i, region.south + rand() * (region.north - region.south), region.west + rand() * (region.east - region.west)),
    );
    const { fetchPage } = fakeUpstream(world);
    const result = await crawlRegion(region, fetchPage, quiet);
    expect(result.places).toHaveLength(300);
    expect(result.incompleteCells).toEqual([]);
    expect(result.places[0]).not.toHaveProperty("distanceMiles");
  });

  it("splits cells where the result cap hides places, and still finds everything", async () => {
    const rand = rng(2);
    // 3,000 places packed into a downtown-sized cluster, far over the 400 cap.
    const world = Array.from({ length: 3000 }, (_, i) =>
      place(i, 44.9 + rand() * 0.12, -93.33 + rand() * 0.16),
    );
    const { fetchPage, calls } = fakeUpstream(world);
    const result = await crawlRegion(region, fetchPage, { ...quiet, maxRequests: 2000 });
    expect(result.places).toHaveLength(3000);
    expect(result.incompleteCells).toEqual([]);
    // Proof that splitting happened: more distinct search centres than the starting grid.
    const centres = new Set(calls.map((c) => `${c.lat},${c.lng}`));
    expect(centres.size).toBeGreaterThan(gridCells(region, 12).length);
  });

  it("pauses between requests", async () => {
    const { fetchPage, calls } = fakeUpstream([place(1, 44.95, -93.2)]);
    const sleeps: number[] = [];
    await crawlRegion(region, fetchPage, { delayMs: 1500, sleep: async (ms) => void sleeps.push(ms) });
    expect(sleeps).toHaveLength(calls.length - 1);
    expect(new Set(sleeps)).toEqual(new Set([1500]));
  });

  it("stops at the request budget instead of running away", async () => {
    const { fetchPage, calls } = fakeUpstream([]);
    await expect(crawlRegion(region, fetchPage, { ...quiet, maxRequests: 3 })).rejects.toThrow(MirrorAbortError);
    expect(calls).toHaveLength(3);
  });

  it("propagates an upstream failure so nothing partial is published", async () => {
    const failing: FetchPage = async () => {
      throw new MirrorAbortError("upstream responded 429");
    };
    await expect(crawlRegion(region, failing, quiet)).rejects.toThrow("429");
  });
});

describe("buildSnapshot", () => {
  it("merges overlapping regions without duplicates", async () => {
    const world = [place(1, 44.95, -93.25), place(2, 45.0, -93.1)];
    const { fetchPage } = fakeUpstream(world);
    const { snapshot } = await buildSnapshot([region, { ...region, name: "again" }], fetchPage, quiet);
    expect(snapshot.count).toBe(2);
    expect(snapshot.places.map((p) => p.name)).toEqual(["PLACE 1", "PLACE 2"]);
    expect(snapshot.regions).toHaveLength(2);
    expect(Number.isNaN(Date.parse(snapshot.generatedAt))).toBe(false);
  });
});
