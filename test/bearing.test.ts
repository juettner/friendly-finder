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
