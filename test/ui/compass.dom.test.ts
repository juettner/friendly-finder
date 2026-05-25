// @vitest-environment jsdom
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
