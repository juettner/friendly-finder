# The Friendly Finder — Design Spec

**Date:** 2026-05-24
**Status:** Approved (brainstorming complete; ready for implementation planning)

## Summary

The Friendly Finder is an installable Progressive Web App that finds the nearest
place serving or selling **Grain Belt Premium**, points a live rotating compass at
it, and one-taps the user into walking directions. It leads with the single closest
place and offers a ranked list of nearby options to retarget the compass.

The app is named "The Friendly Finder" — a nod to Grain Belt's "The Friendly Beer"
tagline.

## Goals

- Open the app, grant location + compass, and immediately see a compass aimed at the
  nearest Premium.
- Live compass needle that rotates as the user physically turns, like a real compass.
- A ranked list of nearby places (bars and liquor stores), each tappable to retarget
  the compass.
- One tap to native-app walking directions.
- Installable to the phone home screen (PWA).

## Non-goals (v1)

- "Open now" filtering / business hours (the data source has no hours; see Data Source).
- Manual location entry (typing a city/zip). Location is **required** in v1.
- An embedded interactive map. We deep-link to the native Maps app instead.
- Accounts, favorites, history, social features.
- Brands other than Premium (the endpoint supports them, but v1 is Premium-only).

## Key decisions (settled during brainstorming)

| Decision | Choice |
| --- | --- |
| Core UX | Closest place up front + ranked list to retarget |
| Valid targets | Bars (on-premise) **and** liquor stores (off-premise), with a type badge |
| Compass | Live rotating compass (degrades to static bearing where no sensor) |
| Main layout | Compass-dominant with a drag-up bottom sheet for the list |
| Visual style | Clean modern: white, Grain Belt red accent `#c8102e`, navy text `#16233a`, crisp sans-serif, generous whitespace |
| Stack | Vite + TypeScript static PWA + a standalone serverless proxy function |
| Hosting | Vercel (static build + serverless function, same origin) |
| Directions | Universal Google Maps directions deep-link, `travelmode=walking` |
| Data scope | Page 0 only (~50 nearest within the source's default 10-mile radius) |

## Data Source

Grain Belt's public beer locator (https://grainbelt.com/beer-locator/) is a custom
WordPress theme script that calls an unauthenticated backend (a Destini/"VIP" locator
feed) proxied through their site:

```
GET https://grainbelt.com/wp-content/themes/grainbelt/inc/vip-ajax.php
      ?lat=<latitude>&long=<longitude>&brand=Premium&page=0
```

It returns **XML** (≈40 KB) containing up to ~50 locations within a server-side
default radius of 10 miles, sorted by distance. Pagination exists
(`total`, `totalPages`, `pagesize=50`) but v1 uses page 0 only.

A representative `<location>` element:

```xml
<location num="1">
  <dba>CROOKED PINT ALE HOUSE</dba>
  <street>501 WASHINGTON AVE</street>
  <city>MINNEAPOLIS</city>
  <state>MN</state>
  <zip>55415</zip>
  <phone>2182098554</phone>
  <phoneFormatted>(218) 209-8554</phoneFormatted>
  <storeTypeRollup>on</storeTypeRollup>   <!-- "on" = on-premise bar; "off" = retail store -->
  <distance>0.2</distance>                <!-- miles from origin -->
  <lat>44.978300</lat>
  <long>-93.260310</long>
  <otherBrands><otherBrand>Premium</otherBrand>...</otherBrands>
</location>
```

Field mapping (XML → app `Place`):

| App field | XML source | Notes |
| --- | --- | --- |
| `name` | `dba` | |
| `type` | `storeTypeRollup` | `on` → `"bar"`, anything else → `"store"` |
| `distanceMiles` | `distance` | already in miles, from origin |
| `lat` / `lng` | `lat` / `long` | needed for compass bearing + directions |
| `address` | `street` | |
| `city` / `state` / `zip` | `city` / `state` / `zip` | |
| `phone` | `phoneFormatted` (fallback `phone`) | |

**Constraints / risks:**
- **No CORS headers** on the upstream endpoint → a browser cannot call it directly.
  This is the reason a server-side proxy exists.
- **No business hours** in the data → no "open now."
- **Rate limits**: the response echoes `softUsageLimit=25`, `maximumUsageLimit=50`.
  We must cache aggressively and send a polite `User-Agent`.
- **Unofficial**: this is Grain Belt's/Destini's internal feed, not a contracted public
  API. If they change or lock it, the app breaks. Acceptable for a personal app.

## Architecture

Two pieces in one repo, both deployed to Vercel. The PWA and the function share an
origin, so no CORS handling is needed between them.

```
friendly-finder/
  index.html
  src/
    main.ts            app wiring + state machine
    geo.ts             geolocation: getCurrentPosition + watchPosition
    heading.ts         device compass heading (iOS + Android normalize, permission)
    bearing.ts         PURE: haversine distance, initial bearing, angle normalization
    client.ts          client for /api/bars -> typed Place[]
    types.ts           shared types (Place, etc.)
    ui/
      compass.ts       renders + rotates the compass needle
      sheet.ts         drag-up bottom sheet with the ranked list
      screens.ts       landing, error, empty, permission-denied states
    styles.css
  api/
    bars.ts            Vercel serverless proxy (fetch XML -> JSON, filter, sort, cache)
    parse.ts           PURE: XML string -> Place[]
  public/
    manifest.webmanifest
    icons/             compass app icons (192, 512, maskable)
  test/
    bearing.test.ts
    parse.test.ts
    bars.test.ts
    fixtures/mpls.xml  real captured Minneapolis response
  vite.config.ts       (vite-plugin-pwa)
  package.json
  tsconfig.json
```

### Module responsibilities

- **`bearing.ts` (pure, tested):** `haversineMiles(a, b)`, `initialBearingDeg(a, b)`
  (0=N, clockwise), `normalizeDeg(x)` → [0,360), `relativeAngle(target, heading)`.
  No DOM, no globals — fully unit-testable.
- **`parse.ts` (pure, tested):** XML string → `Place[]`. No network; takes the raw
  response body as input so it can be tested against the fixture.
- **`geo.ts`:** wraps the Geolocation API; returns the current position and supports
  watching for movement; surfaces permission-denied distinctly.
- **`heading.ts`:** subscribes to the correct orientation event per platform, applies
  screen-orientation correction, low-pass-filters jitter, and emits a single
  normalized compass heading. Exposes `isSupported()` and an iOS
  `requestPermission()` that must be called from a user gesture.
- **`client.ts`:** calls `/api/bars`, returns typed `Place[]`, surfaces errors.
- **`ui/*`:** pure-ish render functions driven by `main.ts` state.

## Data flow

1. **Landing screen.** A single primary button — "Find me a Premium." The tap is
   required to unlock iOS motion permission and to prompt geolocation.
2. `geo.ts` resolves current `{lat, lng}`.
3. `client.ts` requests `/api/bars?lat=<lat>&lng=<lng>`.
4. The proxy calls the upstream endpoint, parses XML, maps types, sorts by distance,
   returns JSON `{ origin, count, places: Place[] }`.
5. UI renders:
   - **Compass** aimed at the nearest place; center shows name, distance, and cardinal
     direction (e.g. "0.2 mi · NE").
   - **Get Directions** button.
   - **Drag-up bottom sheet** with the ranked list (name, type badge, distance).
6. Tapping a list row **retargets** the compass (and the Directions button) to that
   place. `heading.ts` updates keep the needle pointing correctly as the user turns.

## The proxy (`api/bars.ts`)

- **Input validation:** `lat` and `lng` must parse to finite numbers within valid
  ranges (`-90..90`, `-180..180`); otherwise respond `400` with a JSON error.
- **Upstream call:** one GET to page 0 with `brand=Premium`, a descriptive
  `User-Agent`, and a request timeout. (Page 0 returns the ~50 nearest within 10 mi —
  enough for "nearest." Multi-page is a future enhancement.)
- **Parse + transform:** `parse.ts` (`fast-xml-parser`) → `Place[]`; map
  `storeTypeRollup` to `bar`/`store`; sort ascending by `distanceMiles`.
- **Response:** `200` JSON `{ origin:{lat,lng}, count, places:[...] }`.
- **Caching:** key by `lat`/`lng` rounded to ~3 decimal places (~110 m). Set
  `Cache-Control: s-maxage=3600, stale-while-revalidate` so Vercel's edge serves
  repeat/nearby requests without hitting the upstream — this is what keeps us under
  the source's rate limits.
- **Errors:** upstream non-2xx, timeout, or parse failure → `502` with a JSON error
  body the UI can display.

## Live compass

- **Heading source (`heading.ts`):**
  - iOS Safari: `deviceorientation` event → `event.webkitCompassHeading`
    (degrees from north, clockwise).
  - Android/Chromium: `deviceorientationabsolute` → derive heading from `alpha`,
    corrected for `screen.orientation.angle`.
  - Output is normalized to a single convention: compass degrees, 0 = North, clockwise.
  - A low-pass filter smooths sensor jitter.
- **Aim (`bearing.ts`):** `targetBearing = initialBearingDeg(user, target)`.
  Needle rotation = `relativeAngle(targetBearing, deviceHeading)`, applied via CSS
  `transform: rotate(...)` with a short transition for smoothness.
- **iOS permission:** `DeviceOrientationEvent.requestPermission()` is invoked from the
  landing-screen tap (it must originate from a user gesture).
- **Graceful degradation:** if no orientation sensor is available (most desktops, some
  browsers), fall back to a **static, North-up compass** whose needle shows the
  absolute bearing, plus explicit text ("Head NE · 0.2 mi"). The app remains useful on
  a laptop; it simply doesn't rotate.

## Directions & map

The **Get Directions** button opens a universal Google Maps directions deep-link:

```
https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>&travelmode=walking
```

This opens the native Maps app on phones and the web app elsewhere — no Maps API key
and no embedded map library required. On iOS, also offer an Apple Maps option
(`maps://?daddr=<lat>,<lng>&dirflg=w`).

## PWA specifics

- **`manifest.webmanifest`:** `name` "The Friendly Finder", `short_name`
  "Friendly Finder", `theme_color` `#c8102e`, `background_color` `#ffffff`,
  `display: standalone`, `start_url: "/"`, compass icons (192/512/maskable).
- **Service worker (`vite-plugin-pwa` / Workbox):** cache-first for the app shell,
  network-first for `/api/bars`. The app is inherently online; offline shows a
  friendly "you're offline" state rather than stale data.
- **HTTPS:** provided by Vercel (required for Geolocation + DeviceOrientation).

## Visual style

Clean modern. White background, generous whitespace, crisp system sans-serif. Single
accent color **Grain Belt red `#c8102e`** (compass needle, primary button, type badge
for bars), text in navy `#16233a`, muted gray for secondary text. The compass ring is
a light neutral; the needle is red. Minimal chrome.

## Edge cases & error handling

| Case | Behavior |
| --- | --- |
| Location permission denied | Explainer screen describing why location is needed, with a retry button. (Location is required in v1.) |
| No compass sensor | Auto-fallback to static North-up compass + text bearing. |
| Zero results in range | Empty state: "No Premium within 10 miles — you're in exile 🍺." |
| Network / upstream error (502) | Error state with a retry button. |
| Rapid heading updates | Throttled + low-pass filtered to avoid a jittery needle. |
| Offline (no network) | App shell loads; "you're offline" message. |

## Testing strategy

- **Unit tests (Vitest), test-driven:**
  - `bearing.ts` — distance, bearing, and angle-normalization against known
    fixtures (e.g. known city-to-city bearings).
  - `parse.ts` — the real captured Minneapolis XML (`test/fixtures/mpls.xml`) →
    expected `Place[]` (count, ordering, type mapping, field extraction).
- **Proxy tests (`bars.test.ts`):** mock the upstream `fetch` with the fixture →
  assert sorted/filtered JSON; bad params → `400`; upstream failure/timeout → `502`.
- **Manual verification on a real phone (required):** the rotating compass,
  geolocation, and iOS motion-permission flow cannot be meaningfully unit-tested. The
  live compass must be verified on a physical device outdoors before the work is
  considered done. The static-compass fallback can be checked in a desktop browser.

## Open considerations / possible v2

- Manual location entry (geocode a typed city/zip) for when GPS is unavailable or the
  user is planning ahead.
- Brand picker (the endpoint already supports Nordeast, Blu, Oktoberfest, etc.).
- Multi-page fetch / adjustable radius for rural areas.
- "Open now" via a secondary data source (e.g. Google Places) for business hours.
