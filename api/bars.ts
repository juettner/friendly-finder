import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseLocations } from "../lib/parse";
import type { BarsResponse } from "../lib/types";

const UPSTREAM = "https://grainbelt.com/wp-content/themes/grainbelt/inc/vip-ajax.php";
const USER_AGENT = "BuyChadJuettnerABeer/1.0";
const TIMEOUT_MS = 8000;

function coord(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const lat = coord(req.query.lat);
  const lng = coord(req.query.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "lat and lng are required and must be valid coordinates" });
    return;
  }

  const url = `${UPSTREAM}?lat=${lat}&long=${lng}&brand=Premium&page=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/xml,text/xml,*/*" },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      res.status(502).json({ error: `upstream responded ${upstream.status}` });
      return;
    }
    const xml = await upstream.text();
    const places = parseLocations(xml);
    const body: BarsResponse = { origin: { lat, lng }, count: places.length, places };
    res.setHeader("Cache-Control", "public, s-maxage=3600, max-age=0, must-revalidate");
    res.status(200).json(body);
  } catch {
    res.status(502).json({ error: "failed to reach upstream locator" });
  } finally {
    clearTimeout(timer);
  }
}
