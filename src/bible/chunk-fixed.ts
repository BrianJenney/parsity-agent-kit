import { readFileSync, writeFileSync } from "node:fs";
import { extractBody, KJV_PATH } from "./parse.js";

function numberFlag(name: string, fallback: number) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

const size = numberFlag("size", 500);
const overlap = numberFlag("overlap", 0);
const outPath = "data/bible/chunks-fixed.jsonl";

const text = extractBody(readFileSync(KJV_PATH, "utf-8")).replace(/\s+/g, " ").trim();
const chunks = [];
for (let start = 0, id = 0; start < text.length; start += size - overlap, id++) {
  chunks.push({ id, text: text.slice(start, start + size) });
}

writeFileSync(outPath, chunks.map((c) => JSON.stringify(c)).join("\n") + "\n");
console.log(`${chunks.length.toLocaleString()} chunks (size=${size}, overlap=${overlap}) -> ${outPath}\n`);

for (const i of [0, 1000, 5000]) {
  if (!chunks[i]) continue;
  console.log(`--- chunk ${i} ---\n${chunks[i].text.slice(0, 200)}...\n`);
}
console.log("Notice where the chunks start and stop. That's the problem you're solving.");
