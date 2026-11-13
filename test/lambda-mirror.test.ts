import { describe, it, expect, vi } from "vitest";
import { runMirror } from "../lambda/mirror";
import { MirrorAbortError, type FetchPage } from "../lib/mirror";
import type { MirrorSnapshot, Place } from "../lib/types";

const quiet = { delayMs: 0, sleep: async () => {} };

/** An upstream where every search returns the same `n` places. */
function upstreamWith(n: number): FetchPage {
  const places: Place[] = Array.from({ length: n }, (_, i) => ({
    name: `PLACE ${i}`, type: "bar", distanceMiles: 1, lat: 44.95, lng: -93.2,
    address: `${i} MAIN ST`, city: "MINNEAPOLIS", state: "MN", zip: "55401", phone: "",
  }));
  return async (_lat, _lng, page) => ({ total: n, places: places.slice(page * 50, (page + 1) * 50) });
}

describe("runMirror", () => {
  it("publishes the snapshot when the crawl looks healthy", async () => {
    const put = vi.fn(async (_snapshot: MirrorSnapshot) => {});
    const result = await runMirror(upstreamWith(120), put, 100, quiet);
    expect(result.count).toBe(120);
    expect(put).toHaveBeenCalledOnce();
    expect(put.mock.calls[0][0].places).toHaveLength(120);
  });

  it("refuses to publish a suspiciously small result", async () => {
    const put = vi.fn(async (_snapshot: MirrorSnapshot) => {});
    await expect(runMirror(upstreamWith(20), put, 100, quiet)).rejects.toThrow("not publishing");
    expect(put).not.toHaveBeenCalled();
  });

  it("publishes nothing when the upstream fails mid-crawl", async () => {
    const put = vi.fn(async (_snapshot: MirrorSnapshot) => {});
    const failing: FetchPage = async () => {
      throw new MirrorAbortError("upstream responded 429");
    };
    await expect(runMirror(failing, put, 100, quiet)).rejects.toThrow("429");
    expect(put).not.toHaveBeenCalled();
  });
});
