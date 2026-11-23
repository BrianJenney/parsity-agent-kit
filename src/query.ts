import { answerFromContext, rerank, retrieve } from "./rag.js";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const question = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const source = flag("source");
const k = Number(flag("k") ?? 5);
const threshold = flag("threshold") ? Number(flag("threshold")) : undefined;
const useRerank = args.includes("--rerank");

if (!question) {
  console.error('Usage: npm run query -- "your question" [--source file.md] [--k 5] [--rerank] [--threshold 0.4]');
  process.exit(1);
}

const preview = (text: string) => `"${text.slice(0, 70).replace(/\n/g, " ")}..."`;

let hits = await retrieve(question, { k, source, threshold, overFetch: useRerank ? 4 : 1 });
console.log(`\nRetrieved ${hits.length} chunks${source ? ` (filtered to ${source})` : ""}:`);
hits.forEach((h) => console.log(`  ${h.score.toFixed(3)}  ${h.source}${h.heading ? ` > ${h.heading}` : ""}  ${preview(h.text)}`));

if (hits.length === 0) {
  console.log("\nNothing passed the threshold. No context means no hallucinated answer.");
  process.exit(0);
}

if (useRerank) {
  hits = await rerank(question, hits, k);
  console.log(`\nAfter rerank (top ${k}):`);
  hits.forEach((h, i) => console.log(`  #${i + 1}  ${h.source}${h.heading ? ` > ${h.heading}` : ""}  ${preview(h.text)}`));
}

const result = await answerFromContext(question, hits);
console.log("\n" + JSON.stringify(result, null, 2));
if (result.needsHuman) console.log("\n>> Escalating to a human. Wire this to Slack, email, a ticket, whatever.");
