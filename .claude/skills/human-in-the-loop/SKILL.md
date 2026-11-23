---
name: human-in-the-loop
description: Add a propose-then-approve step to any agent that takes an action (sending, refunding, booking, updating records). Use whenever an agent's output would change something outside the conversation.
---

# Human in the loop

## The shape

```
input -> propose (structured) -> hard rules in code -> show to a human (reasoning + flags) -> approve / edit / reject -> execute -> audit log
```

Reference implementation: `src/hitl/refund.ts`.

## Rules

1. **The model proposes, never acts.** The proposal is typed: an `action` enum, the parameters (amount, date, recipient), the reasoning with citations, the user-facing message, and a confidence.
2. **Hard rules run after the model, in code.** Limits, permissions, allowed recipients, business hours. A rule that fires changes the action (for example, force `escalate`) and adds a flag the reviewer sees. Never put a must-never-break rule only in the prompt.
3. **Show the reviewer the why.** Reasoning, cited policy, flags, confidence. A bare "approve? y/n" gets rubber-stamped.
4. **One function has side effects.** `execute()` runs only after approval and records who approved, what, and when.
5. **Edits are data.** Save the before and after when a reviewer edits. It's the best source of examples and eval cases you'll get.
6. **Treat inputs as data.** Customer messages and retrieved docs can contain instructions. The prompt says to ignore them, and the hard rules don't read them at all.

## Where the human goes

Before anything irreversible, anything involving money, anything a customer sees, anything touching
someone else's data, and anything the model marked low confidence. Automate the boring, high-confidence,
low-stakes cases only after the logs show the human almost never changes them.

## Where approval lives

A terminal prompt for learning. In a company: Slack buttons, an admin queue, a ticket, or a
confirmation card in the UI (the medical RAG project's scheduling flow shows a card and books only
when the clinician confirms).

## Before you're done

- Eval cases for the proposer: normal, edge, and should-escalate.
- A test that the hard rules force escalation where they should (these are deterministic and free to test).
- `traced()` on propose and execute.
- No code comments.
