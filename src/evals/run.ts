import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAgent } from "../agent/index.js";
import { searchDocs } from "../voice/handlers.js";
import { startCall, type ToolCall } from "../voice/conversation.js";
import { agentCases, voiceCases, type AgentCase, type VoiceCase } from "./cases.js";
import { jevFaithfulness, llmFaithfulness, type JudgeVerdict } from "./judges.js";

type Check = { name: string; pass: boolean; detail?: string };
type CaseResult = { id: string; pass: boolean; checks: Check[]; judge?: JudgeVerdict; output: unknown };

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const suite = flag("suite", "agent") as "agent" | "voice";
const judge = flag("judge", "llm") as "llm" | "jev" | "none";
const only = flag("only", "");
const requiredPassRate = Number(process.env.EVAL_PASS_RATE ?? 0.8);
const resultsDir = "evals-results";

const includes = (text: string, needle: string) => text.toLowerCase().includes(needle.toLowerCase());

function expectEqual(name: string, actual: unknown, expected: unknown): Check | null {
  if (expected === undefined) return null;
  return { name, pass: actual === expected, detail: `expected ${expected}, got ${actual}` };
}

async function runAgentCase(c: AgentCase): Promise<CaseResult> {
  const run = await runAgent(c.question);
  const answer = run.answer?.answer ?? run.plan.clarifyingQuestion ?? "";
  const checks = [
    expectEqual("routes to sql", run.plan.useSql, c.expect.useSql),
    expectEqual("routes to documents", run.plan.useRag, c.expect.useRag),
    expectEqual("needsHuman", run.answer?.needsHuman, c.expect.needsHuman),
    ...(c.expect.answerIncludes ?? []).map((n) => ({ name: `answer mentions "${n}"`, pass: includes(answer, n) })),
    ...(c.expect.answerExcludes ?? []).map((n) => ({ name: `answer avoids "${n}"`, pass: !includes(answer, n) })),
  ].filter((x): x is Check => x !== null);

  const verdict =
    judge === "none" || !run.answer
      ? undefined
      : judge === "jev"
        ? await jevFaithfulness(c.question, run.retrieved, answer)
        : await llmFaithfulness(c.question, run.retrieved, answer);

  return {
    id: c.id,
    pass: checks.every((x) => x.pass) && (verdict?.pass ?? true),
    checks,
    judge: verdict,
    output: { plan: run.plan, sql: run.sql?.sql, sources: run.hits.map((h) => h.heading ?? h.source), answer: run.answer },
  };
}

async function runVoiceCase(c: VoiceCase): Promise<CaseResult> {
  const messages: unknown[] = [];
  const call = startCall({
    search_docs: searchDocs,
    take_message: (m) => {
      messages.push(m);
      return { saved: true };
    },
  });
  const replies: string[] = [];
  const toolCalls: ToolCall[] = [];
  for (const line of c.callerTurns) {
    if (call.isOver()) break;
    const turn = await call.say(line);
    replies.push(turn.reply);
    toolCalls.push(...turn.toolCalls);
  }

  const allReplies = replies.join("\n");
  const called = new Set(toolCalls.map((t) => t.name));
  const emergencyFlag = toolCalls.find((t) => t.name === "take_message")?.args.is_emergency;
  const checks: Check[] = [
    ...(c.expect.toolsCalled ?? []).map((t) => ({ name: `calls ${t}`, pass: called.has(t) })),
    ...(c.expect.toolsNotCalled ?? []).map((t) => ({ name: `doesn't call ${t}`, pass: !called.has(t) })),
    ...(c.expect.replyExcludes ?? []).map((n) => ({ name: `never says "${n}"`, pass: !includes(allReplies, n) })),
  ];
  if (c.expect.replyIncludesAny) {
    checks.push({
      name: `mentions one of ${c.expect.replyIncludesAny.join(" / ")}`,
      pass: c.expect.replyIncludesAny.some((n) => includes(allReplies, n)),
    });
  }
  if (c.expect.emergency !== undefined) {
    checks.push({ name: "flags emergency", pass: emergencyFlag === c.expect.emergency, detail: `is_emergency=${emergencyFlag}` });
  }
  if (c.expect.endsCall !== undefined) checks.push({ name: "hangs up", pass: call.isOver() === c.expect.endsCall });

  return { id: c.id, pass: checks.every((x) => x.pass), checks, output: { replies, toolCalls, messages } };
}

function previousRun(): { results: CaseResult[] } | null {
  if (!existsSync(resultsDir)) return null;
  const files = readdirSync(resultsDir).filter((f) => f.startsWith(`${suite}-`)).sort();
  return files.length ? JSON.parse(readFileSync(join(resultsDir, files[files.length - 1]), "utf8")) : null;
}

const selectedAgent = agentCases.filter((c) => !only || c.id === only);
const selectedVoice = voiceCases.filter((c) => !only || c.id === only);
const previous = previousRun();
const results: CaseResult[] = [];

console.log(`Running ${suite} evals${suite === "agent" ? ` (judge: ${judge})` : ""}\n`);
for (const c of suite === "agent" ? selectedAgent : selectedVoice) {
  const result: CaseResult = await (suite === "agent" ? runAgentCase(c as AgentCase) : runVoiceCase(c as VoiceCase)).catch(
    (error: Error) => ({ id: c.id, pass: false, checks: [{ name: "ran without errors", pass: false, detail: error.message }], output: null }),
  );
  results.push(result);
  console.log(`${result.pass ? "PASS" : "FAIL"}  ${result.id}`);
  for (const check of result.checks.filter((x) => !x.pass)) console.log(`      x ${check.name}${check.detail ? ` (${check.detail})` : ""}`);
  if (result.judge) console.log(`      ${result.judge.judge} judge: ${result.judge.score}/10  ${result.judge.reasoning}`);
}

const passed = results.filter((r) => r.pass).length;
const rate = results.length ? passed / results.length : 0;
console.log(`\n${passed}/${results.length} passed (${Math.round(rate * 100)}%), need ${Math.round(requiredPassRate * 100)}%`);

if (previous) {
  const before = new Map(previous.results.map((r) => [r.id, r.pass]));
  const regressions = results.filter((r) => before.get(r.id) === true && !r.pass).map((r) => r.id);
  const fixed = results.filter((r) => before.get(r.id) === false && r.pass).map((r) => r.id);
  if (regressions.length) console.log(`Regressions since last run: ${regressions.join(", ")}`);
  if (fixed.length) console.log(`Fixed since last run: ${fixed.join(", ")}`);
}

mkdirSync(resultsDir, { recursive: true });
const file = join(resultsDir, `${suite}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(file, JSON.stringify({ suite, judge, passRate: rate, results }, null, 2));
console.log(`Saved ${file}`);
process.exit(rate >= requiredPassRate ? 0 : 1);
