// @vitest-environment jsdom
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
