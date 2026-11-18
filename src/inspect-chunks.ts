/**
 * Preview chunks WITHOUT embedding anything (free, no API key needed).
 *
 *   npm run chunks -- data/samples/municipal-code.md
 *   CHUNK_STRATEGY=fixed CHUNK_SIZE=300 npm run chunks -- data/samples
 *
 * Look at the output and ask: "If I retrieved only this chunk, could the LLM
 * answer a question about it?" If not, change the strategy before you embed.
 */
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
