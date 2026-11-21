import { business } from "./business.js";

const messageParameters = {
  type: "object",
  properties: {
    caller_name: { type: "string", description: "Caller's name as they spelled it" },
    callback_number: { type: "string", description: "Best callback number, digits only, e.g. 9255551234" },
    location: { type: "string", description: "Street address, or at least the city" },
    issue: { type: "string", description: "One sentence on what's going on, in the caller's words" },
    is_emergency: { type: "boolean", description: "True for active leaks, flooding, no water, sewage backup or a gas smell" },
  },
  required: ["caller_name", "callback_number", "location", "issue", "is_emergency"],
};

export const toolSchemas = {
  search_docs: {
    description: `Search ${business.name}'s docs for pricing, fees, scheduling rules, warranty, refunds and service area. Call this before answering any of those.`,
    parameters: {
      type: "object",
      properties: { question: { type: "string", description: "The caller's question, rephrased as a clear search query" } },
      required: ["question"],
    },
  },
  take_message: {
    description: `Save a callback request for ${business.ownerName}. Only call once you have every field and have confirmed the number.`,
    parameters: messageParameters,
  },
  end_call: {
    description: "Hang up. Call this right after saying bye, and for spam or abusive callers.",
  },
};

export function retellTools(publicUrl: string, apiSecret: string) {
  const headers = { "x-agent-secret": apiSecret };
  return [
    {
      type: "custom",
      name: "search_docs",
      description: toolSchemas.search_docs.description,
      url: `${publicUrl}/tools/search-docs`,
      headers,
      parameters: toolSchemas.search_docs.parameters,
      speak_during_execution: true,
      execution_message_description: "One sec, let me check.",
      execution_message_type: "static_text",
      timeout_ms: 8000,
    },
    {
      type: "custom",
      name: "take_message",
      description: toolSchemas.take_message.description,
      url: `${publicUrl}/tools/take-message`,
      headers,
      parameters: toolSchemas.take_message.parameters,
      speak_during_execution: true,
      execution_message_description: "Alright, getting that over to them now.",
      execution_message_type: "static_text",
      timeout_ms: 8000,
    },
    {
      type: "end_call",
      name: "end_call",
      description: toolSchemas.end_call.description,
    },
  ];
}

export const agentSettings = {
  agent_name: `${business.name} Phone Assistant`,
  voice_id: process.env.RETELL_VOICE_ID ?? "11labs-Adrian",
  language: "en-US",
  model: "gpt-4.1",
  enable_backchannel: true,
  backchannel_frequency: 0.6,
  responsiveness: 0.8,
  interruption_sensitivity: 0.7,
  denoising_mode: "noise-and-background-speech-cancellation",
  max_call_duration_ms: 300000,
  end_call_after_silence_ms: 15000,
  post_call_analysis_data: [
    { type: "string", name: "outcome", description: 'One of: "answered_question", "message_taken", "emergency", "spam_ended", "hung_up"' },
    { type: "boolean", name: "is_emergency", description: "True if the caller described an emergency" },
    { type: "boolean", name: "docs_missing_answer", description: "True if the caller asked something search_docs couldn't answer. These are the gaps in your docs." },
    { type: "string", name: "call_summary", description: `1-2 sentence summary for ${business.ownerName}` },
  ],
} as const;
