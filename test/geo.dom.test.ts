// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { getCurrentPosition, GeoError } from "../src/geo";

afterEach(() => vi.restoreAllMocks());

describe("getCurrentPosition", () => {
  it("resolves to {lat,lng} on success", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 44.9778, longitude: -93.265 } } as GeolocationPosition),
      },
    });
    await expect(getCurrentPosition()).resolves.toEqual({ lat: 44.9778, lng: -93.265 });
  });

  it("rejects with code 'denied' when permission is denied", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, err: PositionErrorCallback) =>
          err({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3, message: "denied" } as GeolocationPositionError),
      },
    });
    await expect(getCurrentPosition()).rejects.toMatchObject({ code: "denied" });
    await expect(getCurrentPosition()).rejects.toBeInstanceOf(GeoError);
  });
});
