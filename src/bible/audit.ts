import { existsSync, readFileSync } from "node:fs";

interface AnyChunk {
  text: string;
  metadata?: Record<string, unknown>;
}

const path = process.argv[2];
if (!path || !existsSync(path)) {
  console.error("Usage: npm run bible:audit -- data/bible/chunks-smart.jsonl");
  process.exit(1);
}

const chunks: AnyChunk[] = readFileSync(path, "utf-8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const total = chunks.length;
const sizes = chunks.map((c) => c.text.length).sort((a, b) => a - b);
const percent = (n: number) => `${n.toLocaleString()} (${((100 * n) / total).toFixed(1)}%)`;

const startsMidWord = chunks.filter((c) => /^[a-z]/.test(c.text.trim())).length;
const endsMidSentence = chunks.filter((c) => !/[.!?:;'"”)\]]$/.test(c.text.trim())).length;
const tooSmall = sizes.filter((s) => s < 100).length;
const hasMetadata = chunks.filter((c) => c.metadata && Object.keys(c.metadata).length > 0).length;
const hasReference = chunks.filter((c) => typeof c.metadata?.reference === "string").length;
const estimatedTokens = Math.round(sizes.reduce((sum, s) => sum + s, 0) / 4);

console.log(`Audit: ${path}`);
console.log(`  chunks:              ${total.toLocaleString()}`);
console.log(`  size min/median/max: ${sizes[0]} / ${sizes[Math.floor(total / 2)]} / ${sizes[total - 1]} chars`);
console.log(`  starts mid-word:     ${percent(startsMidWord)}`);
console.log(`  ends mid-sentence:   ${percent(endsMidSentence)}`);
console.log(`  under 100 chars:     ${percent(tooSmall)}`);
console.log(`  has metadata:        ${percent(hasMetadata)}`);
console.log(`  has a reference:     ${percent(hasReference)}`);
console.log(`  embedding cost:      ~${estimatedTokens.toLocaleString()} tokens, about $${((estimatedTokens / 1e6) * 0.02).toFixed(3)} with text-embedding-3-small`);
