import { renderContext, rerank, retrieve, type Hit } from "../rag.js";
import { traced } from "../observability.js";
import { renderRows, runSql } from "../sql/agent.js";
import { aggregate, type FinalAnswer } from "./aggregator.js";
import { select, type Plan } from "./selector.js";

export type AgentRun = {
  question: string;
  plan: Plan;
  sql?: { sql: string; rows: Record<string, unknown>[] };
  hits: Hit[];
  retrieved: string;
  answer: FinalAnswer | null;
};

async function searchDocuments(query: string) {
  const candidates = await retrieve(query, { k: 5, overFetch: 4, threshold: 0.25 });
  return candidates.length > 5 ? rerank(query, candidates, 5) : candidates;
}

export const runAgent = traced("agent", "chain", async (question: string): Promise<AgentRun> => {
  const plan = await select(question);

  if (plan.clarifyingQuestion && !plan.needsSearch) {
    return { question, plan, hits: [], retrieved: "", answer: null };
  }

  const [sqlResult, hits] = await Promise.all([
    plan.useSql ? runSql(question) : Promise.resolve(undefined),
    plan.useRag ? searchDocuments(plan.searchQuery ?? question) : Promise.resolve([] as Hit[]),
  ]);

  const retrieved = [
    sqlResult ? `${renderRows(sqlResult.rows)}\n(SQL used: ${sqlResult.sql})` : "",
    hits.length ? `Documents:\n${renderContext(hits)}` : plan.useRag ? "Documents: nothing relevant found." : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const answer = await aggregate(question, retrieved);
  return {
    question,
    plan,
    sql: sqlResult ? { sql: sqlResult.sql, rows: sqlResult.rows } : undefined,
    hits,
    retrieved,
    answer,
  };
});
