import "dotenv/config";
import { dave, type PhonicAgent } from "./dave.js";

const baseUrl = "https://api.phonic.ai/v1";
const project = process.env.PHONIC_PROJECT ?? "main";
const dryRun = process.argv.includes("--dry-run");

function apiKey() {
  const key = process.env.PHONIC_API_KEY;
  if (!key) throw new Error("Missing PHONIC_API_KEY in .env. See VOICE.md.");
  return key;
}

async function phonic(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}${path.includes("?") ? "&" : "?"}project=${encodeURIComponent(project)}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function liveAgent(slug: string) {
  const { status, body } = await phonic(`/agents/${slug}`);
  if (status === 404) return null;
  if (status >= 400) throw new Error(`Phonic ${status}: ${JSON.stringify(body)}`);
  return (body.agent ?? body) as Record<string, unknown>;
}

function changedFields(spec: PhonicAgent, live: Record<string, unknown>) {
  return (Object.keys(spec) as (keyof PhonicAgent)[]).filter(
    (key) => JSON.stringify(spec[key]) !== JSON.stringify(live[key]),
  );
}

function asText(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

function firstDifference(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function preview(text: string, from: number) {
  const start = Math.max(0, from - 20);
  const slice = text.slice(start, start + 80).replace(/\n/g, " ");
  return `${start > 0 ? "..." : ""}${slice}${start + 80 < text.length ? "..." : ""}`;
}

const live = await liveAgent(dave.slug);
const changes = live ? changedFields(dave, live) : Object.keys(dave);

if (live && changes.length === 0) {
  console.log(`${dave.slug} is already up to date. Call ${live.phone_number}.`);
  process.exit(0);
}

console.log(live ? `Changes to ${dave.slug}:` : `${dave.slug} doesn't exist yet. It will be created with a new phone number.`);
for (const key of live ? changes : []) {
  const before = asText(live![key]);
  const after = asText(dave[key as keyof PhonicAgent]);
  const at = firstDifference(before, after);
  console.log(`  ${key}`);
  console.log(`    live: ${preview(before, at)}`);
  console.log(`    new:  ${preview(after, at)}`);
}

if (dryRun) {
  console.log("\nDry run. Nothing was sent. Run without --dry-run to deploy.");
  process.exit(0);
}

const body = live ? dave : { ...dave, phone_number: "assign-automatically" };
const { status, body: result } = await phonic("/agents/upsert", { method: "PUT", body: JSON.stringify(body) });
if (status >= 400) throw new Error(`Phonic ${status}: ${JSON.stringify(result)}`);

const agent = (result.agent ?? result) as Record<string, unknown>;
console.log(`\n${live ? "Updated" : "Created"} ${dave.slug}. Call ${agent.phone_number} to hear it.`);
