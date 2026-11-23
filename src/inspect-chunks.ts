import { chunk } from "./chunkers.js";
import { config } from "./config.js";
import { loadDocs } from "./load.js";

const path = process.argv[2] ?? "data/samples";
const docs = loadDocs(path);

console.log(`strategy=${config.chunkStrategy} size=${config.chunkSize} overlap=${config.chunkOverlap}\n`);
for (const doc of docs) {
  const chunks = chunk(doc.text, config.chunkStrategy, { size: config.chunkSize, overlap: config.chunkOverlap });
  const lengths = chunks.map((c) => c.text.length);
  console.log(`=== ${doc.source}: ${chunks.length} chunks (min ${Math.min(...lengths)}, max ${Math.max(...lengths)} chars)`);
  for (const c of chunks) {
    console.log(`\n--- chunk ${c.index}${c.heading ? ` [${c.heading}]` : ""} (${c.text.length} chars)`);
    console.log(c.text);
  }
  console.log();
}
