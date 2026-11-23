import { runAgent } from "./index.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run agent -- "how many remote AI Engineer jobs pay over 150k?"');
  process.exit(1);
}

const run = await runAgent(question);
const { plan } = run;

console.log(`\nPLAN  sql=${plan.useSql} documents=${plan.useRag}  (${plan.reason})`);
if (plan.searchQuery) console.log(`      search query: "${plan.searchQuery}"`);
if (run.sql) console.log(`SQL   ${run.sql.sql}  -> ${run.sql.rows.length} rows`);
if (run.hits.length) console.log(`DOCS  ${run.hits.map((h) => `${h.source}${h.heading ? ` > ${h.heading}` : ""}`).join(" | ")}`);

if (!run.answer) {
  console.log(`\nASK   ${plan.clarifyingQuestion}`);
} else {
  console.log("\n" + JSON.stringify(run.answer, null, 2));
  if (run.answer.needsHuman) console.log("\n>> Not answerable from the data. Hand this to a human.");
}
