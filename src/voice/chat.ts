import { createInterface } from "node:readline/promises";
import { business } from "./business.js";
import { startCall } from "./conversation.js";

const call = startCall();
const rl = createInterface({ input: process.stdin, output: process.stdout });
console.log(`Text-mode phone call with ${business.assistantName}. Type like you'd talk. Ctrl+C to hang up.\n`);
console.log(`${business.assistantName}: ${call.greeting}\n`);

while (!call.isOver()) {
  const turn = await call.say(await rl.question("You: "));
  turn.toolCalls.forEach((t) => console.log(`  [tool] ${t.name} ${JSON.stringify(t.args)}`));
  if (turn.reply) console.log(`\n${business.assistantName}: ${turn.reply}  (${turn.latencyMs}ms)\n`);
}

console.log("[call ended]");
rl.close();
