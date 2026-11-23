import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { config, embed, qdrant } from "../config.js";

type IngestChunk = {
  id?: number;
  text: string;
  metadata?: { reference?: string; book?: string; chapter?: number; verseStart?: number; verseEnd?: number };
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const path = args[0];
const collection = process.env.COLLECTION ?? "bible-kjv";
const reset = args.includes("--reset");
const limit = flag("limit") ? Number(flag("limit")) : undefined;
const strategy = flag("strategy") ?? basename(path ?? "").replace(/^chunks-|\.jsonl$/g, "");
const upsertBatchSize = 256;

if (!path || !existsSync(path)) {
  console.error("Usage: npm run bible:ingest -- data/bible/chunks-smart.jsonl [--reset] [--limit 200] [--strategy name]");
  process.exit(1);
}

const allChunks: IngestChunk[] = readFileSync(path, "utf-8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const chunks = limit ? allChunks.slice(0, limit) : allChunks;
const estimatedTokens = Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / 4);

console.log(`${chunks.length.toLocaleString()} chunks from ${path} -> Qdrant collection "${collection}"`);
console.log(`~${estimatedTokens.toLocaleString()} tokens, about $${((estimatedTokens / 1e6) * 0.02).toFixed(3)} to embed`);

const db = qdrant();
const { exists } = await db.collectionExists(collection);
if (exists && reset) await db.deleteCollection(collection);
if (!exists || reset) {
  await db.createCollection(collection, { vectors: { size: config.embeddingDims, distance: "Cosine" } });
  for (const field of ["source", "strategy", "book"]) {
    await db.createPayloadIndex(collection, { field_name: field, field_schema: "keyword" });
  }
  console.log(`Created collection "${collection}"`);
}

for (let start = 0; start < chunks.length; start += upsertBatchSize) {
  const batch = chunks.slice(start, start + upsertBatchSize);
  const vectors = await embed(batch.map((c) => c.text));
  await db.upsert(collection, {
    wait: true,
    points: batch.map((c, i) => ({
      id: randomUUID(),
      vector: vectors[i],
      payload: {
        text: c.text,
        source: "kjv",
        heading: c.metadata?.reference ?? null,
        ...c.metadata,
        chunkIndex: c.id ?? start + i,
        strategy,
        ingestedAt: new Date().toISOString(),
      },
    })),
  });
  console.log(`  ${Math.min(start + upsertBatchSize, chunks.length).toLocaleString()} / ${chunks.length.toLocaleString()}`);
}

console.log(`\nDone. Search it: COLLECTION=${collection} npm run query -- "verses about not worrying" --rerank`);
console.log("Browse it: http://localhost:6333/dashboard");
