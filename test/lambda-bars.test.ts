import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { handler } from "../lambda/bars";

const xml = readFileSync(
  fileURLToPath(new URL("./fixtures/mpls.xml", import.meta.url)),
  "utf8",
);

afterEach(() => vi.unstubAllGlobals());

describe("lambda /api/bars (Function URL handler)", () => {
  it("returns 400 for missing/invalid coordinates", async () => {
    const res = await handler({ queryStringParameters: {} });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toHaveProperty("error");
  });

  it("returns sorted places and a cache header on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, text: async () => xml })));
    const res = await handler({ queryStringParameters: { lat: "44.9778", lng: "-93.265" } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.count).toBe(3);
    expect(body.places[0].name).toBe("CROOKED PINT ALE HOUSE");
    expect(body.origin).toEqual({ lat: 44.9778, lng: -93.265 });
    expect(res.headers["Cache-Control"]).toContain("s-maxage=3600");
  });

  it("returns 502 when upstream is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "" })));
    const res = await handler({ queryStringParameters: { lat: "44.9778", lng: "-93.265" } });
    expect(res.statusCode).toBe(502);
  });

  it("returns 502 when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    const res = await handler({ queryStringParameters: { lat: "44.9778", lng: "-93.265" } });
    expect(res.statusCode).toBe(502);
  });
});
