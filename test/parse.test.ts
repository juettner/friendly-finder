import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseLocations } from "../lib/parse";

const xml = readFileSync(
  fileURLToPath(new URL("./fixtures/mpls.xml", import.meta.url)),
  "utf8",
);

describe("parseLocations", () => {
  it("returns all locations sorted by distance ascending", () => {
    const places = parseLocations(xml);
    expect(places.map((p) => p.name)).toEqual([
      "CROOKED PINT ALE HOUSE",
      "THE 19 BAR",
      "HUM'S LIQUOR",
    ]);
  });

  it("maps storeTypeRollup to bar/store", () => {
    const places = parseLocations(xml);
    expect(places[0].type).toBe("bar");
    expect(places.find((p) => p.name === "HUM'S LIQUOR")!.type).toBe("store");
  });

  it("prefers phoneFormatted, falls back to raw phone", () => {
    const places = parseLocations(xml);
    expect(places[0].phone).toBe("(612) 204-4534");
    expect(places.find((p) => p.name === "HUM'S LIQUOR")!.phone).toBe("6128270961");
  });

  it("extracts numeric coordinates and distance", () => {
    const [first] = parseLocations(xml);
    expect(first.lat).toBeCloseTo(44.9783, 4);
    expect(first.lng).toBeCloseTo(-93.26031, 5);
    expect(first.distanceMiles).toBeCloseTo(0.2);
  });

  it("returns [] when there are no locations", () => {
    expect(parseLocations("<result><locations></locations></result>")).toEqual([]);
  });

  it("decodes double-encoded HTML entities in names", () => {
    // Upstream double-encodes ampersands: "&amp;amp;" -> after XML decode -> "&amp;"
    const xml = `<result><locations><location num="1">
      <dba>BOTTLE HOUSE WINE &amp;amp; SPIRITS</dba><street>1 MAIN</street>
      <city>ST PAUL</city><state>MN</state><zip>55101</zip><phone>1112223333</phone>
      <storeTypeRollup>off</storeTypeRollup><distance>1.0</distance>
      <lat>45.0</lat><long>-93.0</long></location></locations></result>`;
    const [place] = parseLocations(xml);
    expect(place.name).toBe("BOTTLE HOUSE WINE & SPIRITS");
  });

  it("handles a single (non-array) location", () => {
    const single = `<result><locations><location num="1">
      <dba>SOLO BAR</dba><street>1 MAIN</street><city>X</city><state>MN</state>
      <zip>55001</zip><phone>1112223333</phone><storeTypeRollup>on</storeTypeRollup>
      <distance>1.0</distance><lat>45.0</lat><long>-93.0</long></location></locations></result>`;
    const places = parseLocations(single);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe("SOLO BAR");
  });
});
