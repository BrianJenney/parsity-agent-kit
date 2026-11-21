import "dotenv/config";
import Retell from "retell-sdk";
import { agentSettings, retellTools } from "./agent.js";
import { beginMessage, buildPrompt } from "./prompt.js";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env. See VOICE.md.`);
  return value;
}

const retell = new Retell({ apiKey: required("RETELL_API_KEY") });
const publicUrl = required("PUBLIC_URL").replace(/\/$/, "");
const agentSecret = required("AGENT_API_SECRET");
const phoneNumber = process.env.RETELL_PHONE_NUMBER;

const { agent_name, model, post_call_analysis_data, ...voiceSettings } = agentSettings;

const llmParams = {
  model,
  general_prompt: buildPrompt(),
  begin_message: beginMessage(),
  general_tools: retellTools(publicUrl, agentSecret),
} as unknown as Retell.LlmCreateParams;

const agents = (await retell.agent.list()).items ?? [];
const existing = agents.find((a) => a.agent_name === agent_name);
const existingLlmId = existing
  ? await retell.agent.retrieve(existing.agent_id).then((a) =>
      a.response_engine.type === "retell-llm" ? a.response_engine.llm_id : undefined,
    )
  : undefined;

const llm = existingLlmId ? await retell.llm.update(existingLlmId, llmParams) : await retell.llm.create(llmParams);

const agentParams = {
  ...voiceSettings,
  agent_name,
  response_engine: { type: "retell-llm", llm_id: llm.llm_id },
  post_call_analysis_data,
  webhook_url: `${publicUrl}/webhooks/retell`,
  webhook_events: ["call_analyzed"],
} as unknown as Retell.AgentCreateParams;

const agent = existing
  ? await retell.agent.update(existing.agent_id, agentParams)
  : await retell.agent.create(agentParams);

console.log(`${existing ? "Updated" : "Created"} "${agent_name}"`);
console.log(`  agent_id: ${agent.agent_id}`);
console.log(`  llm_id:   ${llm.llm_id}`);
console.log(`  tools:    ${publicUrl}/tools/*`);

if (phoneNumber) {
  await retell.phoneNumber.update(phoneNumber, {
    inbound_agents: [{ agent_id: agent.agent_id, weight: 1, agent_version: "latest" }],
  });
  console.log(`  phone:    ${phoneNumber} now rings this agent. Call it.`);
} else {
  console.log("\nNo RETELL_PHONE_NUMBER set. Open the agent in the Retell dashboard and hit Test to talk to it in your browser.");
}
