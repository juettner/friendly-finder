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
