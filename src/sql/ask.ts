/**
 * DO YOU EVEN NEED A VECTOR DATABASE?
 *
 *   npm run sql:ask -- "which city has the highest average salary for AI Engineer roles?"
 *   npm run sql:ask -- "how many remote jobs mention qdrant?"
 *
 * "How many", "average", "top 5", "posted last month": that's SQL, not semantic search.
 * Vectors are bad at counting, sorting, and exact matches. Here the LLM writes the
 * query (structured output), we run it READ-ONLY, and the LLM explains the result.
 */
import Database from "better-sqlite3";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { config, openai } from "../config.js";

const question = process.argv.slice(2).join(" ");
if (!question) {
  console.error('Usage: npm run sql:ask -- "your question"');
  process.exit(1);
}

// readonly: true is your first guardrail. Never give an LLM a write connection by default.
const db = new Database("jobs.db", { readonly: true, fileMustExist: true });
const schema = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all() as { sql: string }[])
  .map((r) => r.sql)
  .join("\n");

const QuerySchema = z.object({
  sql: z.string().describe("A single SQLite SELECT statement"),
  reasoning: z.string(),
});

const completion = await openai().beta.chat.completions.parse({
  model: config.chatModel,
  temperature: 0,
  response_format: zodResponseFormat(QuerySchema, "sql_query"),
  messages: [
    { role: "system", content: `Write one SQLite SELECT query to answer the question. Schema:\n${schema}\nAlways LIMIT 50 or fewer rows.` },
    { role: "user", content: question },
  ],
});

const { sql, reasoning } = completion.choices[0].message.parsed!;
console.log(`SQL: ${sql}\nWhy: ${reasoning}\n`);

// Second guardrail: only SELECTs, one statement.
if (!/^\s*select\b/i.test(sql) || sql.replace(/;\s*$/, "").includes(";")) {
  throw new Error("Refusing to run anything but a single SELECT.");
}

const rows = db.prepare(sql).all();
console.table(rows);

const summary = await openai().chat.completions.create({
  model: config.chatModel,
  messages: [{ role: "user", content: `Question: ${question}\nSQL result: ${JSON.stringify(rows)}\nAnswer in 1-2 sentences.` }],
});
console.log("\n" + summary.choices[0].message.content);
