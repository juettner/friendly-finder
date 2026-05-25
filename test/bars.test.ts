import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import handler from "../api/bars";

const xml = readFileSync(
  fileURLToPath(new URL("./fixtures/mpls.xml", import.meta.url)),
  "utf8",
);

function mockRes() {
  const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: undefined };
  res.status = (c: number) => ((res.statusCode = c), res);
  res.json = (b: unknown) => ((res.body = b), res);
  res.setHeader = (k: string, v: string) => void (res.headers[k] = v);
  return res;
}

afterEach(() => vi.unstubAllGlobals());

describe("GET /api/bars", () => {
  it("returns 400 for missing/invalid coordinates", async () => {
    const res = mockRes();
    await handler({ query: {} } as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns sorted places and a cache header on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, text: async () => xml })),
    );
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.places[0].name).toBe("CROOKED PINT ALE HOUSE");
    expect(res.body.origin).toEqual({ lat: 44.9778, lng: -93.265 });
    expect(res.headers["Cache-Control"]).toContain("s-maxage=3600");
  });

  it("returns 502 when upstream is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "" })));
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });

  it("returns 502 when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const res = mockRes();
    await handler({ query: { lat: "44.9778", lng: "-93.265" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });
});
