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
