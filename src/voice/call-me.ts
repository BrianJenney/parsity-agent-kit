import "dotenv/config";
import Retell from "retell-sdk";
import { agentSettings } from "./agent.js";

const [toNumber] = process.argv.slice(2);
const fromNumber = process.env.RETELL_PHONE_NUMBER;
if (!toNumber || !fromNumber || !process.env.RETELL_API_KEY) {
  console.error('Usage: npm run voice:call -- +19255551234   (needs RETELL_API_KEY and RETELL_PHONE_NUMBER in .env)');
  process.exit(1);
}

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
const agent = (await retell.agent.list()).items.find((a) => a.agent_name === agentSettings.agent_name);
if (!agent) throw new Error("Agent not found. Run npm run voice:deploy first.");

const call = await retell.call.createPhoneCall({ from_number: fromNumber, to_number: toNumber, override_agent_id: agent.agent_id });
console.log(`Calling ${toNumber} from ${fromNumber}. call_id: ${call.call_id}`);
