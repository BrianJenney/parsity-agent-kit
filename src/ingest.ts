/**
 * INGEST: text -> chunks -> embeddings -> Qdrant
 *
 *   npm run ingest -- data/samples            # whole folder
 *   npm run ingest -- my-file.md --reset      # wipe the collection first
 *
 * Every chunk gets METADATA (source, heading, strategy, etc). Metadata is how you
 * filter ("only search the HR handbook"), debug ("which strategy made this chunk?"),
 * and cite sources in the answer. Don't skip it.
 */
import { randomUUID } from "node:crypto";
import { chunk } from "./chunkers.js";
import { config, embed, qdrant } from "./config.js";
import { loadDocs } from "./load.js";

const path = process.argv[2];
const reset = process.argv.includes("--reset");
if (!path) {
  console.error("Usage: npm run ingest -- <file-or-folder> [--reset]");
  process.exit(1);
}

async function ensureCollection() {
  const db = qdrant();
  const { exists } = await db.collectionExists(config.collection);
  if (exists && reset) {
    await db.deleteCollection(config.collection);
    console.log(`Deleted collection "${config.collection}"`);
  }
  if (!exists || reset) {
    await db.createCollection(config.collection, {
      vectors: { size: config.embeddingDims, distance: "Cosine" },
    });
    // Payload indexes make metadata filters fast. Index whatever you'll filter on.
    await db.createPayloadIndex(config.collection, { field_name: "source", field_schema: "keyword" });
    await db.createPayloadIndex(config.collection, { field_name: "strategy", field_schema: "keyword" });
    console.log(`Created collection "${config.collection}" (${config.embeddingDims} dims, cosine)`);
  }
}

async function main() {
  await ensureCollection();
  const docs = loadDocs(path);

  for (const doc of docs) {
    const chunks = chunk(doc.text, config.chunkStrategy, { size: config.chunkSize, overlap: config.chunkOverlap });
    console.log(`${doc.source}: ${chunks.length} chunks via "${config.chunkStrategy}". Embedding...`);

    const vectors = await embed(chunks.map((c) => c.text));

    await qdrant().upsert(config.collection, {
      wait: true,
      points: chunks.map((c, i) => ({
        id: randomUUID(),
        vector: vectors[i],
        payload: {
          text: c.text,
          source: doc.source,
          heading: c.heading ?? null,
          chunkIndex: c.index,
          strategy: config.chunkStrategy,
          chunkSize: config.chunkSize,
          ingestedAt: new Date().toISOString(),
        },
      })),
    });
    console.log(`  -> upserted ${chunks.length} points`);
  }
  console.log(`\nDone. Browse it: http://localhost:6333/dashboard`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
