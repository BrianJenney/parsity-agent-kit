import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { KJV_PATH } from "./parse.js";

const SOURCE_URL = "https://www.gutenberg.org/cache/epub/10/pg10.txt";

if (existsSync(KJV_PATH)) {
  console.log(`Already have ${KJV_PATH} (${(statSync(KJV_PATH).size / 1e6).toFixed(1)} MB). Delete it to download again.`);
  process.exit(0);
}

mkdirSync(dirname(KJV_PATH), { recursive: true });
console.log(`Downloading the King James Bible from ${SOURCE_URL} ...`);
const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
const text = await res.text();
writeFileSync(KJV_PATH, text);

console.log(`Wrote ${KJV_PATH} (${(text.length / 1e6).toFixed(1)} MB).`);
console.log("Next: npm run bible:fixed, then read BIBLE.md.");
