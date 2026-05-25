import { parseLocations } from "../lib/parse";
import type { BarsResponse } from "../lib/types";

const UPSTREAM = "https://grainbelt.com/wp-content/themes/grainbelt/inc/vip-ajax.php";
const USER_AGENT = "TheFriendlyFinder/1.0 (personal beer-compass app)";
const TIMEOUT_MS = 8000;

// Minimal shape of a Lambda Function URL request/response (API Gateway v2 payload).
interface FunctionUrlEvent {
  queryStringParameters?: Record<string, string | undefined> | null;
}
interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function coord(v: string | undefined): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function json(statusCode: number, data: unknown, extraHeaders: Record<string, string> = {}): FunctionUrlResult {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(data),
  };
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  const q = event.queryStringParameters ?? {};
  const lat = coord(q.lat);
  const lng = coord(q.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return json(400, { error: "lat and lng are required and must be valid coordinates" });
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
      return json(502, { error: `upstream responded ${upstream.status}` });
    }
    const xml = await upstream.text();
    const places = parseLocations(xml);
    const body: BarsResponse = { origin: { lat, lng }, count: places.length, places };
    return json(200, body, { "Cache-Control": "public, s-maxage=3600, max-age=0, must-revalidate" });
  } catch {
    return json(502, { error: "failed to reach upstream locator" });
  } finally {
    clearTimeout(timer);
  }
}
