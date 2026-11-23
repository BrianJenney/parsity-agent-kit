import Database from "better-sqlite3";
import { z } from "zod";
import { config } from "../config.js";
import { structured } from "../llm.js";
import { traced } from "../observability.js";

export const JOBS_DB = "jobs.db";

const SqlSchema = z.object({
  sql: z.string().describe("One SQLite SELECT statement. No semicolons."),
  reasoning: z.string(),
});

export function assertReadOnly(sql: string) {
  const trimmed = sql.trim().replace(/;\s*$/, "");
  if (!/^select\b/i.test(trimmed) || trimmed.includes(";")) {
    throw new Error(`Refusing to run anything but a single SELECT: ${sql}`);
  }
  return trimmed;
}

function openReadOnly() {
  return new Database(JOBS_DB, { readonly: true, fileMustExist: true });
}

function schemaWithGrounding(db: Database.Database) {
  const schema = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all() as { sql: string }[])
    .map((r) => r.sql)
    .join("\n");
  const titles = (db.prepare("SELECT DISTINCT title FROM jobs").all() as { title: string }[]).map((r) => r.title);
  const cities = (db.prepare("SELECT DISTINCT city FROM jobs").all() as { city: string }[]).map((r) => r.city);
  return [
    schema,
    "remote is 0 or 1. salary_min and salary_max are USD per year. skills is a comma-separated string (use LIKE '%rag%').",
    `Real job titles: ${titles.join("; ")}`,
    `Real cities: ${cities.join("; ")}`,
  ].join("\n\n");
}

export const writeSql = traced("write_sql", "chain", async (question: string) => {
  const db = openReadOnly();
  try {
    return await structured({
      schema: SqlSchema,
      name: "sql_query",
      model: config.chatModel,
      system: `Write one SQLite SELECT to answer the question. Always LIMIT 50 or fewer rows.\n\n${schemaWithGrounding(db)}`,
      user: question,
    });
  } finally {
    db.close();
  }
});

export const runSql = traced("run_sql", "tool", async (question: string) => {
  const { sql, reasoning } = await writeSql(question);
  const db = openReadOnly();
  try {
    const rows = db.prepare(assertReadOnly(sql)).all() as Record<string, unknown>[];
    return { sql, reasoning, rows };
  } finally {
    db.close();
  }
});

export function renderRows(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "SQL result: 0 rows. Nothing matches.";
  const lines = rows.slice(0, 20).map((r) => "- " + Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", "));
  return `SQL result (${rows.length} rows):\n${lines.join("\n")}`;
}
