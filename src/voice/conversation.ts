import type OpenAI from "openai";
import { config, openai } from "../config.js";
import { toolSchemas } from "./agent.js";
import { business } from "./business.js";
import { searchDocs, takeMessage, type Message } from "./handlers.js";
import { beginMessage, buildPrompt } from "./prompt.js";

export type ToolCall = { name: string; args: Record<string, unknown> };
export type Turn = { reply: string; toolCalls: ToolCall[]; ended: boolean; latencyMs: number };
export type ToolHandlers = {
  search_docs: (args: { question: string }) => Promise<unknown> | unknown;
  take_message: (args: Message) => Promise<unknown> | unknown;
};

const tools: OpenAI.ChatCompletionTool[] = Object.entries(toolSchemas).map(([name, schema]) => ({
  type: "function",
  function: {
    name,
    description: schema.description,
    parameters: "parameters" in schema ? schema.parameters : { type: "object", properties: {} },
  },
}));

export const liveHandlers: ToolHandlers = {
  search_docs: searchDocs,
  take_message: (args) => takeMessage(args, "text-sim"),
};

export function startCall(handlers: ToolHandlers = liveHandlers) {
  const now = new Date().toLocaleString("en-US", { timeZone: business.timezone });
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: buildPrompt().replace(/\{\{current_time_[^}]+\}\}/, now) },
    { role: "assistant", content: beginMessage() },
  ];
  let ended = false;

  async function say(callerText: string): Promise<Turn> {
    messages.push({ role: "user", content: callerText });
    const started = Date.now();
    const toolCalls: ToolCall[] = [];
    const replies: string[] = [];

    for (let step = 0; step < 6; step++) {
      const completion = await openai().chat.completions.create({ model: config.chatModel, messages, tools });
      const message = completion.choices[0].message;
      messages.push(message);
      if (message.content) replies.push(message.content);

      const calls = (message.tool_calls ?? []).filter((c) => c.type === "function");
      if (calls.length === 0) break;

      for (const call of calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        toolCalls.push({ name: call.function.name, args });
        if (call.function.name === "end_call") {
          ended = true;
          messages.push({ role: "tool", tool_call_id: call.id, content: "ended" });
          continue;
        }
        const handler = handlers[call.function.name as keyof ToolHandlers] as (a: unknown) => unknown;
        const result = await handler(args);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
      if (ended) break;
    }

    return { reply: replies.join(" "), toolCalls, ended, latencyMs: Date.now() - started };
  }

  return { greeting: beginMessage(), say, isOver: () => ended };
}
