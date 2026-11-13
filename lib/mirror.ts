import type { MirrorPlace, MirrorSnapshot, Place, Region } from "./types";
import { parseResult } from "./parse";

// What the upstream locator does, measured by probing it in November 2026.
export const SEARCH_RADIUS_MILES = 10; // every search covers a 10-mile circle
export const PAGE_SIZE = 50; // results per page
export const RESULT_CAP = 400; // a search never returns more than this many

const UPSTREAM = "https://grainbelt.com/wp-content/themes/grainbelt/inc/vip-ajax.php";
// Says who is asking and where to find them, so the site's admin can get in
// touch rather than just block the crawl.
const USER_AGENT = "FriendlyFinderMirror/1.0 (+https://friendly-finder.com)";
const MILES_PER_DEG_LAT = 69.0;

/** The area mirrored by default: Minneapolis, St. Paul and the surrounding suburbs. */
export const TWIN_CITIES: Region = {
  name: "Minneapolis-St. Paul metro",
  south: 44.62, // Lakeville
  west: -93.7, // Chanhassen / Maple Grove
  north: 45.28, // Anoka / Blaine
  east: -92.88, // Woodbury
};

/** A square-ish patch of the region that one search has to cover. */
export interface Cell {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface PageResult {
  /** Total matches the upstream reports for this search (capped at RESULT_CAP). */
  total: number;
  /** This page's places, each with its distance from the search centre. */
  places: Place[];
}

/** Fetches one page of a search centred on (lat, lng). Injected so tests need no network. */
export type FetchPage = (lat: number, lng: number, page: number) => Promise<PageResult>;

export interface CrawlOptions {
  /** Pause between upstream requests, to stay polite. */
  delayMs?: number;
  /** Hard stop: the crawl fails rather than send more than this many requests. */
  maxRequests?: number;
  /** Starting cell size. Cells split further only where the result cap bites. */
  cellMiles?: number;
  /** Cells are never split below this size; a still-capped cell is reported instead. */
  minCellMiles?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface CrawlResult {
  places: MirrorPlace[];
  requests: number;
  /** Cells that stayed capped even at the minimum size, so may be missing places. */
  incompleteCells: Cell[];
}

/** Thrown when the upstream stops answering normally, e.g. a usage limit. Nothing is published. */
export class MirrorAbortError extends Error {}

function milesPerDegLng(lat: number): number {
  return MILES_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export function cellCenter(c: Cell): { lat: number; lng: number } {
  return { lat: (c.south + c.north) / 2, lng: (c.west + c.east) / 2 };
}

/** Distance from a cell's centre to its corner: the radius a search must reach to cover it. */
export function cellHalfDiagonalMiles(c: Cell): number {
  const { lat } = cellCenter(c);
  const h = ((c.north - c.south) * MILES_PER_DEG_LAT) / 2;
  const w = ((c.east - c.west) * milesPerDegLng(lat)) / 2;
  return Math.hypot(h, w);
}

function cellSideMiles(c: Cell): number {
  const { lat } = cellCenter(c);
  return Math.max((c.north - c.south) * MILES_PER_DEG_LAT, (c.east - c.west) * milesPerDegLng(lat));
}

/** Tiles a region with equal cells no larger than `cellMiles` on a side. */
export function gridCells(region: Region, cellMiles: number): Cell[] {
  const midLat = (region.south + region.north) / 2;
  const rows = Math.max(1, Math.ceil(((region.north - region.south) * MILES_PER_DEG_LAT) / cellMiles));
  const cols = Math.max(1, Math.ceil(((region.east - region.west) * milesPerDegLng(midLat)) / cellMiles));
  const dLat = (region.north - region.south) / rows;
  const dLng = (region.east - region.west) / cols;
  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        south: region.south + r * dLat,
        north: region.south + (r + 1) * dLat,
        west: region.west + c * dLng,
        east: region.west + (c + 1) * dLng,
      });
    }
  }
  return cells;
}

function splitCell(c: Cell): Cell[] {
  const { lat, lng } = cellCenter(c);
  return [
    { south: c.south, north: lat, west: c.west, east: lng },
    { south: c.south, north: lat, west: lng, east: c.east },
    { south: lat, north: c.north, west: c.west, east: lng },
    { south: lat, north: c.north, west: lng, east: c.east },
  ];
}

/** Two searches often return the same place; this is what makes two results "the same place". */
export function placeKey(p: { name: string; address: string; zip: string }): string {
  return `${p.name}|${p.address}|${p.zip}`.toUpperCase();
}

/**
 * Collects every place in a region.
 *
 * The upstream only answers "what is within 10 miles of this point", and never
 * returns more than 400 places. So the region is tiled with cells, one search
 * per cell centre. Where a search hits the cap, it only reached as far as its
 * farthest result; if that is short of the cell's corners, the cell is split in
 * four and each quarter is searched on its own. Dense areas get small cells,
 * sparse areas get big ones, and no request is wasted.
 */
export async function crawlRegion(
  region: Region,
  fetchPage: FetchPage,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const {
    delayMs = 4000,
    maxRequests = 300,
    cellMiles = 12,
    minCellMiles = 1,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log = () => {},
  } = options;

  const found = new Map<string, MirrorPlace>();
  const incompleteCells: Cell[] = [];
  let requests = 0;

  const fetchPaced = async (lat: number, lng: number, page: number): Promise<PageResult> => {
    if (requests >= maxRequests) {
      throw new MirrorAbortError(`request budget of ${maxRequests} exhausted`);
    }
    if (requests > 0) await sleep(delayMs);
    requests++;
    const result = await fetchPage(lat, lng, page);
    for (const { distanceMiles: _distance, ...place } of result.places) {
      found.set(placeKey(place), place);
    }
    return result;
  };

  const queue = gridCells(region, cellMiles);
  while (queue.length > 0) {
    const cell = queue.shift()!;
    const { lat, lng } = cellCenter(cell);
    const needed = cellHalfDiagonalMiles(cell);

    const first = await fetchPaced(lat, lng, 0);
    const capped = first.total >= RESULT_CAP;
    const lastPage = Math.ceil(Math.min(first.total, RESULT_CAP) / PAGE_SIZE) - 1;

    if (capped) {
      // Read the last page first: its farthest result tells us how far this
      // search really reached, so a cell that needs splitting costs 2 requests, not 8.
      const last = await fetchPaced(lat, lng, lastPage);
      const reached = Math.max(0, ...last.places.map((p) => p.distanceMiles));
      // Upstream rounds distances to 0.1 mile, so leave that much margin.
      if (reached - 0.1 < needed) {
        if (cellSideMiles(cell) / 2 >= minCellMiles) {
          log(`cell at ${lat.toFixed(3)},${lng.toFixed(3)} capped at ${reached} mi (needs ${needed.toFixed(1)}); splitting`);
          queue.push(...splitCell(cell));
          continue;
        }
        log(`cell at ${lat.toFixed(3)},${lng.toFixed(3)} still capped at minimum size; may be incomplete`);
        incompleteCells.push(cell);
      }
      for (let page = 1; page < lastPage; page++) await fetchPaced(lat, lng, page);
    } else {
      for (let page = 1; page <= lastPage; page++) await fetchPaced(lat, lng, page);
    }
    log(`cell at ${lat.toFixed(3)},${lng.toFixed(3)}: ${first.total} in range, ${found.size} places so far, ${requests} requests`);
  }

  const places = [...found.values()].sort((a, b) => placeKey(a).localeCompare(placeKey(b)));
  return { places, requests, incompleteCells };
}

/** Crawls each region in turn and assembles the file the app reads. */
export async function buildSnapshot(
  regions: Region[],
  fetchPage: FetchPage,
  options: CrawlOptions = {},
): Promise<{ snapshot: MirrorSnapshot; requests: number; incompleteCells: Cell[] }> {
  const all = new Map<string, MirrorPlace>();
  const incompleteCells: Cell[] = [];
  let requests = 0;
  for (const region of regions) {
    const budget = (options.maxRequests ?? 300) - requests;
    const result = await crawlRegion(region, fetchPage, { ...options, maxRequests: budget });
    requests += result.requests;
    incompleteCells.push(...result.incompleteCells);
    for (const place of result.places) all.set(placeKey(place), place);
  }
  const places = [...all.values()].sort((a, b) => placeKey(a).localeCompare(placeKey(b)));
  return {
    snapshot: { generatedAt: new Date().toISOString(), regions, count: places.length, places },
    requests,
    incompleteCells,
  };
}

/** The real FetchPage: one HTTP request to the upstream locator. */
export const fetchUpstreamPage: FetchPage = async (lat, lng, page) => {
  const url = `${UPSTREAM}?lat=${lat.toFixed(4)}&long=${lng.toFixed(4)}&brand=Premium&page=${page}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new MirrorAbortError(`upstream request failed: ${String(error)}`);
  }
  if (!response.ok) throw new MirrorAbortError(`upstream responded ${response.status}`);
  const { total, places } = parseResult(await response.text());
  // A reply without a <total> is not a locator result: most likely a usage-limit
  // or error page. Stop rather than keep knocking.
  if (total === null) throw new MirrorAbortError("upstream reply was not a locator result");
  return { total, places };
};
