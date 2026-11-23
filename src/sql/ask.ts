import { text } from "../llm.js";
import { runSql } from "./agent.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run sql:ask -- "your question"');
  process.exit(1);
}

const { sql, reasoning, rows } = await runSql(question);
console.log(`SQL: ${sql}\nWhy: ${reasoning}\n`);
console.table(rows);

const summary = await text({
  system: "Answer the question from the SQL result in 1-2 sentences. If the result is empty, say nothing matched.",
  user: `Question: ${question}\nSQL result: ${JSON.stringify(rows)}`,
});
console.log("\n" + summary);
