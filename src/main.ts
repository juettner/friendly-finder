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
