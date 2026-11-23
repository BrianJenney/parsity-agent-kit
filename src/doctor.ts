import "dotenv/config";
import { existsSync } from "node:fs";

type Check = { name: string; ok: boolean; required: boolean; detail: string; fix?: string };

const qdrantUrl = (process.env.QDRANT_URL ?? "http://localhost:6333").replace(/\/$/, "");
const collection = process.env.COLLECTION ?? "docs";
const isSet = (name: string) => Boolean(process.env[name]?.trim());

async function qdrantGet(path: string) {
  const res = await fetch(`${qdrantUrl}${path}`, {
    headers: process.env.QDRANT_API_KEY ? { "api-key": process.env.QDRANT_API_KEY } : {},
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as { result?: { points_count?: number } };
}

async function qdrantChecks(): Promise<Check[]> {
  try {
    await qdrantGet("/collections");
  } catch {
    return [
      {
        name: "Qdrant",
        ok: false,
        required: true,
        detail: `not reachable at ${qdrantUrl}`,
        fix: "npm run db:up   (needs Docker running; or point QDRANT_URL and QDRANT_API_KEY at Qdrant Cloud)",
      },
    ];
  }
  const reachable: Check = { name: "Qdrant", ok: true, required: true, detail: `reachable at ${qdrantUrl}` };
  const points = await qdrantGet(`/collections/${collection}`)
    .then((body) => body.result?.points_count ?? 0)
    .catch(() => 0);
  return [
    reachable,
    {
      name: `"${collection}" collection`,
      ok: points > 0,
      required: false,
      detail: points > 0 ? `${points} points` : "empty or missing (needed from module 02 on)",
      fix: "npm run ingest -- data/samples --reset",
    },
  ];
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
const openAiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const hasOpenAiKey = openAiKey.length > 0 && openAiKey !== "sk-...";

const checks: Check[] = [
  { name: "Node", ok: nodeMajor >= 22, required: true, detail: `v${process.versions.node}`, fix: "install Node 22 or newer" },
  { name: "Dependencies", ok: existsSync("node_modules"), required: true, detail: existsSync("node_modules") ? "installed" : "missing", fix: "npm install" },
  { name: ".env", ok: existsSync(".env"), required: true, detail: existsSync(".env") ? "found" : "missing", fix: "cp .env.example .env" },
  { name: "OPENAI_API_KEY", ok: hasOpenAiKey, required: true, detail: hasOpenAiKey ? "set" : "not set", fix: "add your key to .env (the developer does this, not the agent)" },
  ...(await qdrantChecks()),
  { name: "jobs.db", ok: existsSync("jobs.db"), required: false, detail: existsSync("jobs.db") ? "seeded" : "missing (needed from module 02 on)", fix: "npm run sql:seed" },
  { name: "Progress file", ok: existsSync(".learning/progress.md"), required: false, detail: existsSync(".learning/progress.md") ? ".learning/progress.md" : "not started", fix: "start curriculum/00-start.md" },
  { name: "LangSmith (module 07)", ok: process.env.LANGSMITH_TRACING === "true" && isSet("LANGSMITH_API_KEY"), required: false, detail: "optional", fix: "set LANGSMITH_TRACING=true and LANGSMITH_API_KEY in .env" },
  { name: "Jev judge (module 06)", ok: isSet("TYPESAFE_API_KEY"), required: false, detail: "optional", fix: "set TYPESAFE_API_KEY in .env" },
  { name: "Retell (module 08)", ok: isSet("RETELL_API_KEY"), required: false, detail: "optional", fix: "set RETELL_API_KEY in .env (see VOICE.md)" },
];

for (const check of checks) {
  const status = check.ok ? "ok  " : check.required ? "FAIL" : "todo";
  console.log(`${status}  ${check.name}: ${check.detail}${check.ok || !check.fix ? "" : `\n      fix: ${check.fix}`}`);
}

const blocking = checks.filter((check) => check.required && !check.ok);
console.log(
  blocking.length
    ? `\n${blocking.length} required ${blocking.length === 1 ? "thing is" : "things are"} missing. Fix the FAIL lines, then run npm run doctor again.`
    : "\nReady. Open curriculum/00-start.md, or .learning/progress.md if it exists.",
);
process.exit(blocking.length ? 1 : 0);
