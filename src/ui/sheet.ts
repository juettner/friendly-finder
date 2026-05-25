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
