// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mountCompass, setNeedle } from "../../src/ui/compass";

describe("compass UI", () => {
  it("mounts a compass with a crinkled ring and a needle", () => {
    const root = document.createElement("div");
    mountCompass(root);
    expect(root.querySelector(".compass")).not.toBeNull();
    expect(root.querySelector(".compass-ring")).not.toBeNull();
    expect(root.querySelector(".needle")).not.toBeNull();
  });

  it("rotates the needle around the compass center via the SVG transform attribute", () => {
    const root = document.createElement("div");
    mountCompass(root);
    setNeedle(root, 90);
    // SVG attribute (not CSS transform) so it rotates reliably on iOS Safari.
    expect(root.querySelector(".needle")!.getAttribute("transform")).toBe("rotate(90 256 256)");
  });
});
