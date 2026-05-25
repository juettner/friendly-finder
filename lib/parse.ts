import { XMLParser } from "fast-xml-parser";
import type { Place, PlaceType } from "./types";

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep values as strings; we convert numbers ourselves
  trimValues: true,
});

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Upstream double-encodes entities (e.g. "&amp;amp;"); fast-xml-parser strips
// only the XML layer, leaving one HTML layer ("&amp;") that we decode here.
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code[0] === "#") {
      const cp =
        code[1] === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

function str(v: unknown): string {
  return v == null ? "" : decodeEntities(String(v).trim());
}

function toType(rollup: string): PlaceType {
  return rollup.toLowerCase() === "on" ? "bar" : "store";
}

export function parseLocations(xml: string): Place[] {
  const doc = parser.parse(xml);
  const raw = doc?.result?.locations?.location;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];

  const places: Place[] = arr.map((l: Record<string, unknown>) => ({
    name: str(l.dba),
    type: toType(str(l.storeTypeRollup)),
    distanceMiles: Number(str(l.distance)) || 0,
    lat: Number(str(l.lat)),
    lng: Number(str(l.long)),
    address: str(l.street),
    city: str(l.city),
    state: str(l.state),
    zip: str(l.zip),
    phone: str(l.phoneFormatted) || str(l.phone),
  }));

  return places.sort((a, b) => a.distanceMiles - b.distanceMiles);
}
