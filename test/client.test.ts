import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchNearbyPlaces } from "../src/client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchNearbyPlaces", () => {
  it("rounds coordinates to 3 decimals in the request URL", async () => {
    const f = vi.fn(async () => ({ ok: true, json: async () => ({ places: [] }) }));
    vi.stubGlobal("fetch", f);
    await fetchNearbyPlaces(44.977812, -93.265049);
    expect(f).toHaveBeenCalledWith("/api/bars?lat=44.978&lng=-93.265");
  });

  it("returns the places array on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ places: [{ name: "X" }] }),
    })));
    const places = await fetchNearbyPlaces(44.9778, -93.265);
    expect(places).toHaveLength(1);
  });

  it("throws with the server error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ error: "failed to reach upstream locator" }),
    })));
    await expect(fetchNearbyPlaces(44.9778, -93.265)).rejects.toThrow("upstream");
  });
});
