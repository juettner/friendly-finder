import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { buildSnapshot, fetchUpstreamPage, TWIN_CITIES, type CrawlOptions, type FetchPage } from "../lib/mirror";
import type { MirrorSnapshot } from "../lib/types";

/** Writes the finished snapshot somewhere. Injected so tests need no AWS. */
export type PutSnapshot = (snapshot: MirrorSnapshot) => Promise<void>;

export interface MirrorRunResult {
  count: number;
  requests: number;
  incompleteCells: number;
}

/**
 * Crawl, sanity-check, publish, in that order. If the crawl fails or comes back
 * suspiciously small, this throws BEFORE publishing, so last week's good file
 * stays in place rather than being replaced by a broken one.
 */
export async function runMirror(
  fetchPage: FetchPage,
  put: PutSnapshot,
  minPlaces: number,
  options: CrawlOptions = {},
): Promise<MirrorRunResult> {
  const { snapshot, requests, incompleteCells } = await buildSnapshot([TWIN_CITIES], fetchPage, options);
  if (snapshot.count < minPlaces) {
    throw new Error(`only ${snapshot.count} places found (expected at least ${minPlaces}); not publishing`);
  }
  await put(snapshot);
  return { count: snapshot.count, requests, incompleteCells: incompleteCells.length };
}

/** Entry point for the weekly EventBridge schedule. */
export async function handler(): Promise<MirrorRunResult> {
  const bucket = process.env.DATA_BUCKET;
  if (!bucket) throw new Error("DATA_BUCKET is not set");
  const key = process.env.DATA_KEY ?? "data/places.json";
  const minPlaces = Number(process.env.MIN_PLACES ?? "500");

  const s3 = new S3Client({});
  const put: PutSnapshot = async (snapshot) => {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(snapshot),
        ContentType: "application/json",
        CacheControl: "public, max-age=3600",
      }),
    );
  };

  const result = await runMirror(fetchUpstreamPage, put, minPlaces, { log: (m) => console.log(m) });
  console.log(`published ${result.count} places to s3://${bucket}/${key} after ${result.requests} requests`);
  return result;
}
