// Runs the mirror crawl from your own machine and writes places.json.
//
//   npm run mirror                      -> ios/FriendlyFinder/Resources/places.json
//   npm run mirror -- --out some/file.json
//
// The scheduled Lambda (lambda/mirror.ts) does the same crawl and writes to S3;
// this script is for bundling a copy into the iOS app and for trying changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildSnapshot, fetchUpstreamPage, TWIN_CITIES } from "../lib/mirror";

const outFlag = process.argv.indexOf("--out");
const out = resolve(outFlag > -1 ? process.argv[outFlag + 1] : "ios/FriendlyFinder/Resources/places.json");

const started = Date.now();
const { snapshot, requests, incompleteCells } = await buildSnapshot([TWIN_CITIES], fetchUpstreamPage, {
  log: (message) => console.log(message),
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot));

const seconds = Math.round((Date.now() - started) / 1000);
console.log(`\n${snapshot.count} places, ${requests} requests, ${seconds}s -> ${out}`);
if (incompleteCells.length > 0) {
  console.warn(`warning: ${incompleteCells.length} cell(s) stayed capped and may be missing places`);
}
