import { createInterface } from "node:readline/promises";
import type OpenAI from "openai";
import { config, openai } from "../config.js";
import { toolSchemas } from "./agent.js";
import { business } from "./business.js";
import { searchDocs, takeMessage } from "./handlers.js";
import { beginMessage, buildPrompt } from "./prompt.js";

const now = new Date().toLocaleString("en-US", { timeZone: business.timezone });
const systemPrompt = buildPrompt().replace(/\{\{current_time_[^}]+\}\}/, now);

const tools: OpenAI.ChatCompletionTool[] = Object.entries(toolSchemas).map(([name, schema]) => ({
  type: "function",
  function: { name, description: schema.description, parameters: "parameters" in schema ? schema.parameters : { type: "object", properties: {} } },
}));

const runTool: Record<string, (args: any) => Promise<unknown> | unknown> = {
  search_docs: searchDocs,
  take_message: (args) => takeMessage(args, "text-sim"),
};

const messages: OpenAI.ChatCompletionMessageParam[] = [
  { role: "system", content: systemPrompt },
  { role: "assistant", content: beginMessage() },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log(`Text-mode phone call with ${business.assistantName}. Type like you'd talk. Ctrl+C to hang up.\n`);
console.log(`${business.assistantName}: ${beginMessage()}\n`);

let callOver = false;
while (!callOver) {
  messages.push({ role: "user", content: await rl.question("You: ") });

  let replied = false;
  while (!replied) {
    const started = Date.now();
    const completion = await openai().chat.completions.create({ model: config.chatModel, messages, tools });
    const reply = completion.choices[0].message;
    messages.push(reply);

    for (const call of reply.tool_calls ?? []) {
      if (call.type !== "function") continue;
      if (call.function.name === "end_call") {
        callOver = true;
        messages.push({ role: "tool", tool_call_id: call.id, content: "ended" });
        continue;
      }
      const result = await runTool[call.function.name](JSON.parse(call.function.arguments));
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }

    if (reply.content) console.log(`\n${business.assistantName}: ${reply.content}  (${Date.now() - started}ms)\n`);
    replied = !reply.tool_calls?.length || callOver;
  }
}

console.log("[call ended]");
rl.close();
