import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import Retell from "retell-sdk";
import { logCall, searchDocs, takeMessage, type Message } from "./handlers.js";

const port = Number(process.env.VOICE_PORT ?? 3030);
const agentSecret = process.env.AGENT_API_SECRET ?? "";
const retellApiKey = process.env.RETELL_API_KEY ?? "";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function hasAgentSecret(req: IncomingMessage) {
  const given = Buffer.from(String(req.headers["x-agent-secret"] ?? ""));
  const expected = Buffer.from(agentSecret);
  return agentSecret.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

async function handleTool(req: IncomingMessage, res: ServerResponse, run: (args: any, callId?: string) => unknown) {
  if (!hasAgentSecret(req)) return send(res, 401, { error: "unauthorized" });
  const { args, call } = JSON.parse(await readBody(req));
  send(res, 200, await run(args, call?.call_id));
}

async function handleWebhook(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const signature = String(req.headers["x-retell-signature"] ?? "");
  if (!(await Retell.verify(raw, retellApiKey, signature))) return send(res, 401, { error: "bad signature" });

  const { event, call } = JSON.parse(raw);
  if (event === "call_analyzed") {
    const analysis = call.call_analysis ?? {};
    logCall({
      call_id: call.call_id,
      from: call.from_number,
      duration_ms: call.duration_ms,
      ...analysis.custom_analysis_data,
      summary: analysis.call_summary,
      transcript: call.transcript,
    });
    console.log(`call_analyzed ${call.call_id}: ${analysis.custom_analysis_data?.outcome ?? "unknown"}`);
  }
  send(res, 200, { ok: true });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "POST") return send(res, 404, { error: "not found" });
    if (req.url === "/tools/search-docs") return await handleTool(req, res, searchDocs);
    if (req.url === "/tools/take-message") return await handleTool(req, res, (args: Message, callId) => takeMessage(args, callId));
    if (req.url === "/webhooks/retell") return await handleWebhook(req, res);
    send(res, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    send(res, 500, { error: "Something broke on our side. Offer a callback instead." });
  }
});

if (!agentSecret) throw new Error("Set AGENT_API_SECRET in .env (any long random string).");
server.listen(port, () => console.log(`Voice tool server on http://localhost:${port}`));
