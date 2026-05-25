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
