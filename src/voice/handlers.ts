import { appendFileSync } from "node:fs";
import { config, embed, qdrant } from "../config.js";
import { business } from "./business.js";

export const voiceConfig = {
  docsSource: process.env.VOICE_DOCS_SOURCE ?? business.docsSource,
  scoreThreshold: Number(process.env.VOICE_SCORE_THRESHOLD ?? 0.3),
  topK: 3,
  messagesFile: "voice-messages.jsonl",
  callsFile: "voice-calls.jsonl",
};

export async function searchDocs({ question }: { question: string }) {
  const started = Date.now();
  const [vector] = await embed([question]);
  const { points } = await qdrant().query(config.collection, {
    query: vector,
    limit: voiceConfig.topK,
    score_threshold: voiceConfig.scoreThreshold,
    with_payload: true,
    filter: voiceConfig.docsSource
      ? { must: [{ key: "source", match: { value: voiceConfig.docsSource } }] }
      : undefined,
  });

  const passages = points.map((p) => ({
    section: (p.payload?.heading as string | null) ?? null,
    text: String(p.payload?.text ?? ""),
  }));

  console.log(`search_docs "${question}" -> ${passages.length} passages in ${Date.now() - started}ms`);

  if (passages.length === 0) {
    return { found: false, instruction: "Nothing in the docs answers this. Don't guess. Offer a callback." };
  }
  return { found: true, passages };
}

export type Message = {
  caller_name: string;
  callback_number: string;
  location: string;
  issue: string;
  is_emergency: boolean;
};

export function takeMessage(message: Message, callId?: string) {
  const record = { ...message, call_id: callId ?? null, taken_at: new Date().toISOString() };
  appendFileSync(voiceConfig.messagesFile, JSON.stringify(record) + "\n");
  console.log(`take_message ${message.is_emergency ? "[EMERGENCY] " : ""}${message.caller_name}: ${message.issue}`);
  return { saved: true };
}

export function logCall(record: Record<string, unknown>) {
  appendFileSync(voiceConfig.callsFile, JSON.stringify(record) + "\n");
}
