# The Friendly Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable PWA that points a live compass at the nearest place serving/selling Grain Belt Premium and one-taps the user into walking directions.

**Architecture:** A Vite + TypeScript static PWA plus a single Vercel serverless function (`/api/bars`) that proxies Grain Belt's locator XML endpoint, converts it to JSON, sorts by distance, and caches. The PWA gets the user's location and compass heading in the browser, computes the bearing to the target, and rotates a needle. Directions are a native Maps deep-link (no Maps API key).

**Tech Stack:** Vite, TypeScript, Vitest (+ jsdom for DOM tests), fast-xml-parser, vite-plugin-pwa, `@vercel/node`, deployed on Vercel.

---

## File Structure

```
friendly-finder/
  index.html                  app shell
  api/
    bars.ts                   Vercel function -> GET /api/bars (imports from ../lib)
  lib/                        server-side / shared pure code (NOT Vercel endpoints)
    types.ts                  shared types: LatLng, Place, PlaceType, BarsResponse
    parse.ts                  PURE: XML string -> Place[]  (tested)
  src/                        frontend
    main.ts                   wiring + state machine
    bearing.ts                PURE: distance/bearing/angle math (tested)
    directions.ts             PURE: build Maps deep-link (tested)
    client.ts                 fetch /api/bars -> Place[] (tested)
    geo.ts                    geolocation wrapper (tested in jsdom)
    heading.ts                device compass heading (pure parts tested)
    ui/
      compass.ts              mount + update the compass (tested in jsdom)
      sheet.ts                ranked list / bottom sheet (tested in jsdom)
      screens.ts              landing / error / empty states (tested in jsdom)
    styles.css                clean-modern theme
  public/
    manifest.webmanifest      (added in Task 11)
    icons/                    app icons (added in Task 11)
  test/
    fixtures/mpls.xml         curated sample upstream response
    bearing.test.ts
    parse.test.ts
    bars.test.ts
    client.test.ts
    directions.test.ts
    geo.dom.test.ts
    heading.test.ts
    ui/compass.dom.test.ts
    ui/sheet.dom.test.ts
    ui/screens.dom.test.ts
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  package.json
```

**Why `lib/` exists:** Vercel deploys *every* file under `api/` as its own serverless endpoint. Pure helpers (`parse.ts`, shared `types.ts`) must therefore live outside `api/`. `api/bars.ts` imports them from `../lib`; Vercel bundles imported modules into the function. Frontend type-only imports from `lib/types.ts` are erased at build, so nothing server-side leaks into the browser bundle.

**Vitest environment:** default `node`. DOM tests opt in with a `// @vitest-environment jsdom` docblock at the top of the file (used by `*.dom.test.ts`).

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "the-friendly-finder",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fast-xml-parser": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@vercel/node": "^3.2.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.1.0"
  }
}
```

> If any version fails to resolve, install the latest of that package instead (e.g. `npm i -D vite vitest typescript`).

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "lib", "api", "test", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`** (PWA plugin added later in Task 11)

```ts
import { defineConfig } from "vite";

export default defineConfig({});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#c8102e" />
    <title>The Friendly Finder</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Create placeholder `src/main.ts`** (replaced in Task 10)

```ts
const app = document.querySelector<HTMLDivElement>("#app");
if (app) app.textContent = "The Friendly Finder";
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/` created.

- [ ] **Step 8: Verify build + typecheck pass**

Run: `npm run build`
Expected: `tsc` reports no errors and Vite writes `dist/`.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/main.ts
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export interface LatLng {
  lat: number;
  lng: number;
}

export type PlaceType = "bar" | "store";

export interface Place {
  name: string;
  type: PlaceType;
  distanceMiles: number;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface BarsResponse {
  origin: LatLng;
  count: number;
  places: Place[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared Place/LatLng types"
```

---

## Task 3: Bearing math (`src/bearing.ts`)

**Files:**
- Create: `src/bearing.ts`
- Test: `test/bearing.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/bearing.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizeDeg,
  initialBearingDeg,
  relativeAngle,
  degToCardinal,
} from "../src/bearing";

describe("normalizeDeg", () => {
  it("wraps into [0,360)", () => {
    expect(normalizeDeg(370)).toBeCloseTo(10);
    expect(normalizeDeg(-10)).toBeCloseTo(350);
    expect(normalizeDeg(360)).toBeCloseTo(0);
    expect(normalizeDeg(0)).toBeCloseTo(0);
  });
});

describe("initialBearingDeg", () => {
  it("returns cardinal bearings from the equator", () => {
    expect(initialBearingDeg({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 0);   // N
    expect(initialBearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 0);  // E
    expect(initialBearingDeg({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })).toBeCloseTo(180, 0);// S
    expect(initialBearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: -1 })).toBeCloseTo(270, 0);// W
  });
});

describe("relativeAngle", () => {
  it("subtracts heading from target bearing, normalized", () => {
    expect(relativeAngle(90, 0)).toBeCloseTo(90);
    expect(relativeAngle(0, 90)).toBeCloseTo(270);
    expect(relativeAngle(45, 45)).toBeCloseTo(0);
  });
});

describe("degToCardinal", () => {
  it("maps degrees to 8-point compass labels", () => {
    expect(degToCardinal(0)).toBe("N");
    expect(degToCardinal(45)).toBe("NE");
    expect(degToCardinal(90)).toBe("E");
    expect(degToCardinal(350)).toBe("N");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/bearing.test.ts`
Expected: FAIL — cannot resolve `../src/bearing`.

- [ ] **Step 3: Write the implementation**

```ts
// src/bearing.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/bearing.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/bearing.ts test/bearing.test.ts
git commit -m "feat: add bearing/distance math with tests"
```

---

## Task 4: XML parsing (`lib/parse.ts`)

**Files:**
- Create: `test/fixtures/mpls.xml`, `lib/parse.ts`
- Test: `test/parse.test.ts`

- [ ] **Step 1: Create the fixture `test/fixtures/mpls.xml`** (curated: deliberately out of distance order; HUM'S has no `phoneFormatted`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<result>
  <custID>AUG</custID>
  <total>3</total>
  <locations>
    <location num="1">
      <dba>HUM'S LIQUOR</dba>
      <street>2926 BRYANT AVE S</street>
      <city>MINNEAPOLIS</city>
      <state>MN</state>
      <zip>55408</zip>
      <phone>6128270961</phone>
      <storeTypeRollup>off</storeTypeRollup>
      <distance>0.6</distance>
      <lat>44.948000</lat>
      <long>-93.290000</long>
    </location>
    <location num="2">
      <dba>CROOKED PINT ALE HOUSE</dba>
      <street>501 WASHINGTON AVE</street>
      <city>MINNEAPOLIS</city>
      <state>MN</state>
      <zip>55415</zip>
      <phone>6122044534</phone>
      <phoneFormatted>(612) 204-4534</phoneFormatted>
      <storeTypeRollup>on</storeTypeRollup>
      <distance>0.2</distance>
      <lat>44.978300</lat>
      <long>-93.260310</long>
    </location>
    <location num="3">
      <dba>THE 19 BAR</dba>
      <street>19 W 15TH ST</street>
      <city>MINNEAPOLIS</city>
      <state>MN</state>
      <zip>55403</zip>
      <phone>6128715553</phone>
      <phoneFormatted>(612) 871-5553</phoneFormatted>
      <storeTypeRollup>on</storeTypeRollup>
      <distance>0.4</distance>
      <lat>44.962000</lat>
      <long>-93.283000</long>
    </location>
  </locations>
</result>
```

- [ ] **Step 2: Write the failing test**

```ts
// test/parse.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseLocations } from "../lib/parse";

const xml = readFileSync(
  fileURLToPath(new URL("./fixtures/mpls.xml", import.meta.url)),
  "utf8",
);

describe("parseLocations", () => {
  it("returns all locations sorted by distance ascending", () => {
    const places = parseLocations(xml);
    expect(places.map((p) => p.name)).toEqual([
      "CROOKED PINT ALE HOUSE",
      "THE 19 BAR",
      "HUM'S LIQUOR",
    ]);
  });

  it("maps storeTypeRollup to bar/store", () => {
    const places = parseLocations(xml);
    expect(places[0].type).toBe("bar");
    expect(places.find((p) => p.name === "HUM'S LIQUOR")!.type).toBe("store");
  });

  it("prefers phoneFormatted, falls back to raw phone", () => {
    const places = parseLocations(xml);
    expect(places[0].phone).toBe("(612) 204-4534");
    expect(places.find((p) => p.name === "HUM'S LIQUOR")!.phone).toBe("6128270961");
  });

  it("extracts numeric coordinates and distance", () => {
    const [first] = parseLocations(xml);
    expect(first.lat).toBeCloseTo(44.9783, 4);
    expect(first.lng).toBeCloseTo(-93.26031, 5);
    expect(first.distanceMiles).toBeCloseTo(0.2);
  });

  it("returns [] when there are no locations", () => {
    expect(parseLocations("<result><locations></locations></result>")).toEqual([]);
  });

  it("handles a single (non-array) location", () => {
    const single = `<result><locations><location num="1">
      <dba>SOLO BAR</dba><street>1 MAIN</street><city>X</city><state>MN</state>
      <zip>55001</zip><phone>1112223333</phone><storeTypeRollup>on</storeTypeRollup>
      <distance>1.0</distance><lat>45.0</lat><long>-93.0</long></location></locations></result>`;
    const places = parseLocations(single);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe("SOLO BAR");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/parse.test.ts`
Expected: FAIL — cannot resolve `../lib/parse`.

- [ ] **Step 4: Write the implementation**

```ts
// lib/parse.ts
import { XMLParser } from "fast-xml-parser";
import type { Place, PlaceType } from "./types";

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep values as strings; we convert numbers ourselves
  trimValues: true,
});

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function toType(rollup: string): PlaceType {
  return rollup.toLowerCase() === "on" ? "bar" : "store";
}

export function parseLocations(xml: string): Place[] {
  const doc = parser.parse(xml);
  const raw = doc?.result?.locations?.location;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];

  const places: Place[] = arr.map((l: Record<string, unknown>) => ({
    name: str(l.dba),
    type: toType(str(l.storeTypeRollup)),
    distanceMiles: Number(str(l.distance)) || 0,
    lat: Number(str(l.lat)),
    lng: Number(str(l.long)),
    address: str(l.street),
    city: str(l.city),
    state: str(l.state),
    zip: str(l.zip),
    phone: str(l.phoneFormatted) || str(l.phone),
  }));

  return places.sort((a, b) => a.distanceMiles - b.distanceMiles);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/parse.test.ts`
Expected: PASS (6 assertions green).

- [ ] **Step 6: Commit**

```bash
git add lib/parse.ts test/parse.test.ts test/fixtures/mpls.xml
git commit -m "feat: parse Grain Belt locator XML into sorted Place[]"
```

---

## Task 5: Serverless proxy (`api/bars.ts`)

**Files:**
- Create: `api/bars.ts`
- Test: `test/bars.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/bars.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import handler from "../api/bars";

const xml = readFileSync(
  fileURLToPath(new URL("./fixtures/mpls.xml", import.meta.url)),
  "utf8",
);

function mockRes() {
  const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: undefined };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = (k: string, v: string) => void (res.headers[k] = v);
  return res;
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/bars", () => {
  it("returns 400 for missing/invalid coordinates", async () => {
    const res = mockRes();
    await handler({ query: {} } as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns sorted places and a cache header on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => xml })),
    );
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.places[0].name).toBe("CROOKED PINT ALE HOUSE");
    expect(res.body.origin).toEqual({ lat: 44.9778, lng: -93.265 });
    expect(res.headers["Cache-Control"]).toContain("s-maxage=3600");
  });

  it("returns 502 when upstream is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "" })));
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });

  it("returns 502 when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/bars.test.ts`
Expected: FAIL — cannot resolve `../api/bars`.

- [ ] **Step 3: Write the implementation**

```ts
// api/bars.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseLocations } from "../lib/parse";
import type { BarsResponse } from "../lib/types";

const UPSTREAM = "https://grainbelt.com/wp-content/themes/grainbelt/inc/vip-ajax.php";
const USER_AGENT = "TheFriendlyFinder/1.0 (personal beer-compass app)";
const TIMEOUT_MS = 8000;

function coord(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const lat = coord(req.query.lat);
  const lng = coord(req.query.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "lat and lng are required and must be valid coordinates" });
    return;
  }

  const url = `${UPSTREAM}?lat=${lat}&long=${lng}&brand=Premium&page=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream responded ${upstream.status}` });
      return;
    }
    const xml = await upstream.text();
    const places = parseLocations(xml);
    const body: BarsResponse = { origin: { lat, lng }, count: places.length, places };
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(body);
  } catch {
    res.status(502).json({ error: "failed to reach upstream locator" });
  } finally {
    clearTimeout(timer);
  }
}
```

> **Cache note:** the edge cache key is the request URL. Cache sharing for nearby users relies on the **client** rounding coordinates before calling (done in Task 6, `client.ts`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/bars.test.ts`
Expected: PASS (4 assertions green).

- [ ] **Step 5: Commit**

```bash
git add api/bars.ts test/bars.test.ts
git commit -m "feat: add /api/bars serverless proxy with caching and error handling"
```

---

## Task 6: Client + directions (`src/client.ts`, `src/directions.ts`)

**Files:**
- Create: `src/client.ts`, `src/directions.ts`
- Test: `test/client.test.ts`, `test/directions.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// test/directions.test.ts
import { describe, it, expect } from "vitest";
import { directionsUrl } from "../src/directions";
import type { Place } from "../lib/types";

const place: Place = {
  name: "CROOKED PINT", type: "bar", distanceMiles: 0.2,
  lat: 44.9783, lng: -93.26031, address: "501 WASHINGTON AVE",
  city: "MINNEAPOLIS", state: "MN", zip: "55415", phone: "(612) 204-4534",
};

describe("directionsUrl", () => {
  it("uses Google Maps walking on non-iOS", () => {
    const url = directionsUrl(place, "Mozilla/5.0 (Windows NT 10.0)");
    expect(url).toContain("google.com/maps/dir/");
    expect(url).toContain("destination=44.9783,-93.26031");
    expect(url).toContain("travelmode=walking");
  });
  it("uses Apple Maps walking on iOS", () => {
    const url = directionsUrl(place, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(url).toContain("maps.apple.com");
    expect(url).toContain("daddr=44.9783,-93.26031");
    expect(url).toContain("dirflg=w");
  });
});
```

```ts
// test/client.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchNearbyPlaces } from "../src/client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchNearbyPlaces", () => {
  it("rounds coordinates to 3 decimals in the request URL", async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ places: [] }) }));
    vi.stubGlobal("fetch", f);
    await fetchNearbyPlaces(44.977812, -93.265049);
    expect(f).toHaveBeenCalledWith("/api/bars?lat=44.978&lng=-93.265");
  });

  it("returns the places array on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ places: [{ name: "X" }] }),
    })));
    const places = await fetchNearbyPlaces(44.9778, -93.265);
    expect(places).toHaveLength(1);
  });

  it("throws with the server error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ error: "failed to reach upstream locator" }),
    })));
    await expect(fetchNearbyPlaces(44.9778, -93.265)).rejects.toThrow("upstream");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/directions.test.ts test/client.test.ts`
Expected: FAIL — cannot resolve `../src/directions` / `../src/client`.

- [ ] **Step 3: Write `src/directions.ts`**

```ts
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
```

- [ ] **Step 4: Write `src/client.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/directions.test.ts test/client.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/client.ts src/directions.ts test/client.test.ts test/directions.test.ts
git commit -m "feat: add API client (coord rounding) and Maps directions link"
```

---

## Task 7: Geolocation wrapper (`src/geo.ts`)

**Files:**
- Create: `src/geo.ts`
- Test: `test/geo.dom.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment jsdom
// test/geo.dom.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { getCurrentPosition, GeoError } from "../src/geo";

afterEach(() => vi.restoreAllMocks());

describe("getCurrentPosition", () => {
  it("resolves to {lat,lng} on success", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 44.9778, longitude: -93.265 } } as GeolocationPosition),
      },
    });
    await expect(getCurrentPosition()).resolves.toEqual({ lat: 44.9778, lng: -93.265 });
  });

  it("rejects with code 'denied' when permission is denied", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3, message: "denied" } as GeolocationPositionError),
      },
    });
    await expect(getCurrentPosition()).rejects.toMatchObject({ code: "denied" });
    await expect(getCurrentPosition()).rejects.toBeInstanceOf(GeoError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/geo.dom.test.ts`
Expected: FAIL — cannot resolve `../src/geo`.

- [ ] **Step 3: Write the implementation**

```ts
// src/geo.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/geo.dom.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/geo.ts test/geo.dom.test.ts
git commit -m "feat: add geolocation wrapper with typed errors"
```

---

## Task 8: Compass heading (`src/heading.ts`)

**Files:**
- Create: `src/heading.ts`
- Test: `test/heading.test.ts`

- [ ] **Step 1: Write the failing test** (pure functions only; the `window` subscription is verified manually on device)

```ts
// test/heading.test.ts
import { describe, it, expect } from "vitest";
import { computeHeading, lowPass } from "../src/heading";

describe("computeHeading", () => {
  it("uses webkitCompassHeading when present (iOS)", () => {
    expect(computeHeading({ webkitCompassHeading: 123.4 })).toBeCloseTo(123.4);
  });
  it("derives heading from alpha when webkit is absent (Android)", () => {
    // alpha=90, screenAngle=0 -> 360-90-0 = 270
    expect(computeHeading({ alpha: 90 })).toBeCloseTo(270);
  });
  it("subtracts screen angle", () => {
    expect(computeHeading({ alpha: 90 }, 90)).toBeCloseTo(180);
  });
  it("returns null when no usable data", () => {
    expect(computeHeading({})).toBeNull();
    expect(computeHeading({ alpha: null })).toBeNull();
  });
});

describe("lowPass", () => {
  it("moves toward the new value", () => {
    expect(lowPass(10, 20, 0.5)).toBeCloseTo(15);
  });
  it("takes the short path across the 360/0 seam", () => {
    expect(lowPass(350, 10, 0.5)).toBeCloseTo(0); // not ~180
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/heading.test.ts`
Expected: FAIL — cannot resolve `../src/heading`.

- [ ] **Step 3: Write the implementation**

```ts
// src/heading.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/heading.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/heading.ts test/heading.test.ts
git commit -m "feat: add device compass heading with smoothing and iOS permission"
```

---

## Task 9: UI components (`src/ui/compass.ts`, `src/ui/sheet.ts`, `src/ui/screens.ts`)

**Files:**
- Create: `src/ui/compass.ts`, `src/ui/sheet.ts`, `src/ui/screens.ts`
- Test: `test/ui/compass.dom.test.ts`, `test/ui/sheet.dom.test.ts`, `test/ui/screens.dom.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// @vitest-environment jsdom
// test/ui/compass.dom.test.ts
import { describe, it, expect } from "vitest";
import { mountCompass, setNeedle, setTarget } from "../../src/ui/compass";
import type { Place } from "../../lib/types";

const place: Place = {
  name: "CROOKED PINT", type: "bar", distanceMiles: 0.23,
  lat: 44.9783, lng: -93.26031, address: "", city: "", state: "", zip: "", phone: "",
};

describe("compass UI", () => {
  it("mounts a compass with a needle and center", () => {
    const root = document.createElement("div");
    mountCompass(root);
    expect(root.querySelector(".needle")).not.toBeNull();
    expect(root.querySelector(".compass-center")).not.toBeNull();
  });

  it("sets target name and meta (distance + cardinal)", () => {
    const root = document.createElement("div");
    mountCompass(root);
    setTarget(root, place, 45); // 45deg -> NE
    expect(root.querySelector(".place-name")!.textContent).toBe("CROOKED PINT");
    expect(root.querySelector(".place-meta")!.textContent).toBe("0.2 mi · NE");
  });

  it("rotates the needle", () => {
    const root = document.createElement("div");
    mountCompass(root);
    setNeedle(root, 90);
    expect((root.querySelector(".needle") as HTMLElement).style.transform).toContain("rotate(90deg)");
  });
});
```

```ts
// @vitest-environment jsdom
// test/ui/sheet.dom.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderList } from "../../src/ui/sheet";
import type { Place } from "../../lib/types";

const places: Place[] = [
  { name: "CROOKED PINT", type: "bar", distanceMiles: 0.2, lat: 0, lng: 0, address: "", city: "", state: "", zip: "", phone: "" },
  { name: "HUM'S LIQUOR", type: "store", distanceMiles: 0.6, lat: 0, lng: 0, address: "", city: "", state: "", zip: "", phone: "" },
];

describe("sheet list", () => {
  it("renders one row per place with a type badge and distance", () => {
    const root = document.createElement("div");
    renderList(root, places, () => {});
    const rows = root.querySelectorAll(".place-row");
    expect(rows).toHaveLength(2);
    expect(root.textContent).toContain("STORE");
    expect(root.textContent).toContain("0.6 mi");
  });

  it("calls onSelect with the clicked place", () => {
    const root = document.createElement("div");
    const onSelect = vi.fn();
    renderList(root, places, onSelect);
    (root.querySelectorAll(".place-row")[1] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith(places[1], 1);
  });
});
```

```ts
// @vitest-environment jsdom
// test/ui/screens.dom.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderLanding, renderMessage } from "../../src/ui/screens";

describe("screens", () => {
  it("landing fires onStart when the button is clicked", () => {
    const root = document.createElement("div");
    const onStart = vi.fn();
    renderLanding(root, onStart);
    (root.querySelector("button") as HTMLElement).click();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("message shows title and body, and fires onAction", () => {
    const root = document.createElement("div");
    const onAction = vi.fn();
    renderMessage(root, { title: "Nope", body: "Try again", actionLabel: "Retry", onAction });
    expect(root.textContent).toContain("Nope");
    expect(root.textContent).toContain("Try again");
    (root.querySelector("button") as HTMLElement).click();
    expect(onAction).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/ui`
Expected: FAIL — cannot resolve the `src/ui/*` modules.

- [ ] **Step 3: Write `src/ui/compass.ts`**

```ts
import type { Place } from "../../lib/types";
import { degToCardinal } from "../bearing";

export function mountCompass(root: HTMLElement): void {
  root.innerHTML = `
    <div class="compass" role="img" aria-label="Compass pointing to the nearest Premium">
      <div class="needle"></div>
      <div class="compass-center">
        <strong class="place-name"></strong>
        <span class="place-meta"></span>
      </div>
    </div>`;
}

export function setNeedle(root: HTMLElement, rotationDeg: number): void {
  const needle = root.querySelector<HTMLElement>(".needle");
  if (needle) needle.style.transform = `translate(-50%, -100%) rotate(${rotationDeg}deg)`;
}

export function setTarget(root: HTMLElement, place: Place, bearingDeg: number): void {
  const name = root.querySelector<HTMLElement>(".place-name");
  const meta = root.querySelector<HTMLElement>(".place-meta");
  if (name) name.textContent = place.name;
  if (meta) meta.textContent = `${place.distanceMiles.toFixed(1)} mi · ${degToCardinal(bearingDeg)}`;
}
```

- [ ] **Step 4: Write `src/ui/sheet.ts`** (DOM built with `textContent` — no HTML injection)

```ts
import type { Place } from "../../lib/types";

export function renderList(
  root: HTMLElement,
  places: Place[],
  onSelect: (place: Place, index: number) => void,
): void {
  root.innerHTML = "";
  places.forEach((place, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "place-row";

    const badge = document.createElement("span");
    badge.className = `badge badge-${place.type}`;
    badge.textContent = place.type === "bar" ? "BAR" : "STORE";

    const name = document.createElement("span");
    name.className = "row-name";
    name.textContent = place.name;

    const dist = document.createElement("span");
    dist.className = "row-dist";
    dist.textContent = `${place.distanceMiles.toFixed(1)} mi`;

    row.append(badge, name, dist);
    row.addEventListener("click", () => onSelect(place, index));
    root.appendChild(row);
  });
}
```

- [ ] **Step 5: Write `src/ui/screens.ts`**

```ts
export function renderLanding(root: HTMLElement, onStart: () => void): void {
  root.innerHTML = `
    <section class="screen landing">
      <h1>The Friendly Finder</h1>
      <p class="tagline">Find the nearest Grain Belt Premium.</p>
      <button type="button" class="primary start">Find me a Premium</button>
    </section>`;
  root.querySelector<HTMLButtonElement>(".start")!.addEventListener("click", onStart);
}

export interface MessageOptions {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function renderMessage(root: HTMLElement, opts: MessageOptions): void {
  root.innerHTML = `
    <section class="screen message">
      <h2 class="msg-title"></h2>
      <p class="msg-body"></p>
    </section>`;
  root.querySelector<HTMLElement>(".msg-title")!.textContent = opts.title;
  root.querySelector<HTMLElement>(".msg-body")!.textContent = opts.body;
  if (opts.actionLabel && opts.onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary";
    btn.textContent = opts.actionLabel;
    btn.addEventListener("click", opts.onAction);
    root.querySelector(".message")!.appendChild(btn);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run test/ui`
Expected: PASS (all three files green).

- [ ] **Step 7: Commit**

```bash
git add src/ui test/ui
git commit -m "feat: add compass, list, and screen UI components with tests"
```

---

## Task 10: Wiring + styles (`src/main.ts`, `src/styles.css`)

**Files:**
- Modify: `src/main.ts` (replace placeholder)
- Create: `src/styles.css`

- [ ] **Step 1: Replace `src/main.ts` with the full state machine**

```ts
import "./styles.css";
import type { LatLng, Place } from "../lib/types";
import { getCurrentPosition, GeoError } from "./geo";
import { fetchNearbyPlaces } from "./client";
import { directionsUrl } from "./directions";
import { initialBearingDeg, relativeAngle } from "./bearing";
import {
  isOrientationSupported,
  requestHeadingPermission,
  watchHeading,
} from "./heading";
import { mountCompass, setNeedle, setTarget } from "./ui/compass";
import { renderList } from "./ui/sheet";
import { renderLanding, renderMessage } from "./ui/screens";

const app = document.querySelector<HTMLDivElement>("#app")!;

let userPos: LatLng;
let target: Place;
let live = false;
let stopHeading: (() => void) | null = null;

function targetLatLng(): LatLng {
  return { lat: target.lat, lng: target.lng };
}

function aimAt(place: Place, compassRoot: HTMLElement, dirBtn: HTMLAnchorElement): void {
  target = place;
  const bearing = initialBearingDeg(userPos, targetLatLng());
  setTarget(compassRoot, place, bearing);
  dirBtn.href = directionsUrl(place, navigator.userAgent);
  if (!live) setNeedle(compassRoot, bearing); // static: north-up, needle = absolute bearing
}

function showResults(places: Place[]): void {
  if (stopHeading) { stopHeading(); stopHeading = null; }

  app.innerHTML = `
    <main class="screen results">
      <div class="compass-host"></div>
      <a class="primary directions" target="_blank" rel="noopener">Get Directions →</a>
      ${live ? "" : '<p class="static-note">Compass unavailable — arrow shows direction from North.</p>'}
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="list"></div>
      </div>
    </main>`;

  const compassRoot = app.querySelector<HTMLElement>(".compass-host")!;
  const dirBtn = app.querySelector<HTMLAnchorElement>(".directions")!;
  const listRoot = app.querySelector<HTMLElement>(".list")!;

  mountCompass(compassRoot);
  aimAt(places[0], compassRoot, dirBtn);
  renderList(listRoot, places, (place) => aimAt(place, compassRoot, dirBtn));

  if (live) {
    stopHeading = watchHeading((heading) => {
      setNeedle(compassRoot, relativeAngle(initialBearingDeg(userPos, targetLatLng()), heading));
    });
  }
}

async function start(): Promise<void> {
  app.innerHTML = `<section class="screen message"><h2 class="msg-title">Locating…</h2><p class="msg-body">Getting your position.</p></section>`;
  live = isOrientationSupported() && (await requestHeadingPermission());

  try {
    userPos = await getCurrentPosition();
  } catch (err) {
    const denied = err instanceof GeoError && err.code === "denied";
    renderMessage(app, {
      title: denied ? "Location needed" : "Couldn't get your location",
      body: denied
        ? "The Friendly Finder needs your location to point you at a Premium. Enable location and try again."
        : "Something went wrong getting your location. Try again.",
      actionLabel: "Try again",
      onAction: () => void start(),
    });
    return;
  }

  try {
    const places = await fetchNearbyPlaces(userPos.lat, userPos.lng);
    if (places.length === 0) {
      renderMessage(app, {
        title: "No Premium nearby",
        body: "No Grain Belt Premium within ~10 miles — you're in exile. 🍺",
        actionLabel: "Try again",
        onAction: () => void start(),
      });
      return;
    }
    showResults(places);
  } catch {
    renderMessage(app, {
      title: "Couldn't reach the locator",
      body: "We couldn't load nearby places. Check your connection and try again.",
      actionLabel: "Try again",
      onAction: () => void start(),
    });
  }
}

renderLanding(app, () => void start());
```

- [ ] **Step 2: Create `src/styles.css`** (clean-modern: white, Grain Belt red `#c8102e`, navy `#16233a`)

```css
:root {
  --red: #c8102e;
  --navy: #16233a;
  --muted: #8a93a3;
  --bg: #ffffff;
  --line: #eef0f3;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--navy);
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); }
#app { min-height: 100dvh; display: flex; flex-direction: column; }

.screen { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24px; }
.landing { justify-content: center; text-align: center; gap: 12px; }
.landing h1 { font-size: 1.9rem; margin: 0; }
.tagline { color: var(--muted); margin: 0 0 8px; }

.primary {
  display: inline-block; background: var(--red); color: #fff; border: 0;
  border-radius: 14px; padding: 14px 22px; font-size: 1rem; font-weight: 700;
  text-decoration: none; cursor: pointer;
}

.results { justify-content: flex-start; gap: 16px; padding-bottom: 0; }

.compass-host { margin-top: 8px; }
.compass {
  position: relative; width: min(78vw, 320px); aspect-ratio: 1; border-radius: 50%;
  border: 2px solid var(--line);
  background: radial-gradient(circle at 50% 45%, #fff, #f6f7f9);
}
.needle {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -100%) rotate(0deg);
  transform-origin: 50% 100%;
  width: 0; height: 0;
  border-left: 14px solid transparent; border-right: 14px solid transparent;
  border-bottom: calc(min(78vw, 320px) * 0.42) solid var(--red);
  transition: transform 120ms linear;
}
.compass-center {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; pointer-events: none;
}
.place-name { font-size: 1rem; }
.place-meta { font-size: 0.85rem; color: var(--muted); margin-top: 4px; }

.directions { text-align: center; }
.static-note { color: var(--muted); font-size: 0.8rem; margin: 0; }

.sheet {
  width: 100%; margin-top: auto; background: #fff; border-top-left-radius: 18px;
  border-top-right-radius: 18px; box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
  max-height: 42dvh; overflow-y: auto; padding-bottom: 8px;
}
.sheet-handle { width: 38px; height: 4px; border-radius: 2px; background: #d7dbe2; margin: 8px auto; }

.place-row {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 12px 16px; border: 0; border-bottom: 1px solid var(--line);
  background: none; font: inherit; color: inherit; text-align: left; cursor: pointer;
}
.row-name { flex: 1; }
.row-dist { color: var(--muted); font-size: 0.85rem; }
.badge { font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 9px; }
.badge-bar { background: #fbe3e7; color: var(--red); }
.badge-store { background: #eef0f3; color: var(--navy); }

.message { justify-content: center; text-align: center; gap: 10px; }
```

- [ ] **Step 3: Verify the full test suite still passes**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: typecheck clean, `dist/` written.

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, open the printed URL. Confirm: landing screen → "Find me a Premium" → browser prompts for location → results screen renders a compass, a Directions link, and a list. (Desktop has no motion sensor, so you'll see the static-compass note — that's expected.) Clicking a list row retargets the compass + Directions link.

> The stylesheet needs no `index.html` change — `import "./styles.css"` in `main.ts` is what Vite bundles.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/styles.css
git commit -m "feat: wire app state machine and clean-modern styles"
```

---

## Task 11: PWA (manifest, icons, service worker)

**Files:**
- Create: `public/icons/compass.svg`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create the app icon `public/icons/compass.svg`** (dependency-free; a red needle on white with maskable-safe padding — the needle stays well within the central 80% safe zone)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#eef0f3" stroke-width="14"/>
  <polygon points="256,118 298,300 256,266 214,300" fill="#c8102e"/>
</svg>
```

Expected: `public/icons/compass.svg` exists.

- [ ] **Step 2: Configure `vite-plugin-pwa` in `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/compass.svg"],
      manifest: {
        name: "The Friendly Finder",
        short_name: "Friendly Finder",
        description: "Find the nearest Grain Belt Premium.",
        theme_color: "#c8102e",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/compass.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/bars"),
            handler: "NetworkFirst",
            options: { cacheName: "bars-api", networkTimeoutSeconds: 8 },
          },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 3: Build and verify PWA assets are emitted**

Run: `npm run build`
Expected: `dist/` contains `manifest.webmanifest`, a generated service worker (`sw.js`), and `dist/icons/compass.svg`.

- [ ] **Step 4: Verify install metadata in the browser**

Run: `npm run preview`, open the URL, DevTools → Application → Manifest. Confirm name, theme color `#c8102e`, and all three icons load. (Service workers run under `preview`/production build, not `dev`.)

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public/icons
git commit -m "feat: make it an installable PWA (manifest, icons, service worker)"
```

---

## Task 12: Deploy to Vercel + on-device verification

**Files:** none (deployment + manual test)

- [ ] **Step 1: Confirm the full suite and build are green**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 2: Deploy a preview to Vercel**

Run: `npx vercel` (first run links/creates the project; accept the Vite framework preset and default build settings).
Expected: a preview URL is printed. Vercel serves the static `dist/` and exposes `api/bars.ts` at `/api/bars`.

- [ ] **Step 3: Smoke-test the deployed API**

Run: `curl "https://<preview-url>/api/bars?lat=44.9778&lng=-93.265" | head -c 400`
Expected: JSON with `"count"` > 0 and a `places` array (nearest first). If you get a 502, check the function logs with `npx vercel logs <preview-url>`.

- [ ] **Step 4: On-device verification of the live compass (REQUIRED — cannot be unit-tested)**

On a real phone, open the preview URL over HTTPS:
- Tap "Find me a Premium"; grant location and (iOS) motion access.
- Confirm a bar/store appears with a sensible distance.
- **Physically rotate** and confirm the needle rotates to keep pointing at the target (it should point roughly toward the named place).
- Tap a different list row and confirm the needle + Directions retarget.
- Tap "Get Directions" and confirm the native Maps app opens walking directions.
- Add to Home Screen and confirm it launches standalone with the red theme.

- [ ] **Step 5: Promote to production (optional)**

Run: `npx vercel --prod`
Expected: production URL printed.

- [ ] **Step 6: Commit any config produced by Vercel** (e.g. `.vercel/` is git-ignored by default; if a `vercel.json` was created, commit it)

```bash
git add -A
git commit -m "chore: vercel project configuration" || echo "nothing to commit"
```

---

## Notes for the implementer

- **TDD order matters:** write the test, watch it fail, implement, watch it pass, commit. Don't batch.
- **The data feed is unofficial.** `api/bars.ts` depends on Grain Belt's locator XML shape. If `parse.test.ts` starts failing against a freshly captured response, the upstream format changed — update `lib/parse.ts` and the fixture together.
- **Be polite to the upstream** while developing: the `s-maxage` cache only helps in production. Avoid hammering `/api/bars` in a tight loop locally (their feed echoes `softUsageLimit=25`).
- **Compass correctness is device-specific.** The math is unit-tested; the sensor wiring (`watchHeading`) is verified only on a real phone in Task 12.
- **Distance comes from upstream.** Each `Place.distanceMiles` is the upstream feed's distance from the user's coordinates, so the client never recomputes distance (no haversine needed). `bearing.ts` only computes direction.
