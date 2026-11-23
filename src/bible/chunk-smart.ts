import { writeFileSync } from "node:fs";
import { loadVerses, type Verse } from "./parse.js";

export type BibleChunk = {
  id: number;
  text: string;
  metadata: {
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
    reference: string;
  };
};

function numberFlag(name: string, fallback: number) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(process.argv[i + 1]);
}

const options = {
  targetChars: numberFlag("target", 800),
  overlapVerses: numberFlag("overlap-verses", 0),
};

export function buildChunks(verses: Verse[], { targetChars, overlapVerses }: typeof options): BibleChunk[] {
  throw new Error("Your turn: write buildChunks() in src/bible/chunk-smart.ts. The rules are in curriculum/01-data-and-chunking.md.");
}

const outPath = "data/bible/chunks-smart.jsonl";
const verses = loadVerses();
const chunks = buildChunks(verses, options);
writeFileSync(outPath, chunks.map((c) => JSON.stringify(c)).join("\n") + "\n");
console.log(`${verses.length.toLocaleString()} verses -> ${chunks.length.toLocaleString()} chunks -> ${outPath}`);
console.log(`Next: npm run bible:audit -- ${outPath}`);
