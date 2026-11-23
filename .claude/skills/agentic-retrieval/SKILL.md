---
name: agentic-retrieval
description: Build a router that decides which data sources or tools answer a question (SQL, vector search, both, neither), runs them, and answers only from what came back. Use when one question could need more than one source.
---

# Agentic retrieval

## Default shape (a workflow with an LLM router)

```
question -> selector (structured plan) -> specialists in parallel (each returns text) -> aggregator (grounded answer)
```

Reference implementation: `src/agent/`.

- **Selector** (`selector.ts`): only routes. Returns booleans per source, a one-line reason, a rewritten search query, and an optional clarifying question. No entity extraction, no answering.
- **Specialists:** each owns one source and returns rendered text. SQL agent (`src/sql/agent.ts`) writes one read-only SELECT with real values from the table in the prompt. Document search (`src/rag.ts`) retrieves, optionally reranks, applies a score threshold.
- **Orchestrator** (`index.ts`): plain TypeScript decides what runs. `Promise.all` for independent specialists. Returns everything (plan, SQL, hits, answer) so evals and debugging can see each step.
- **Aggregator** (`aggregator.ts`): the only step that talks to the user. Answers only from retrieved data, cites it, sets `needsHuman` when it can't answer.

## Decide first: workflow or agent?

- **Workflow** (code decides the steps): predictable, cheap, easy to test. The right default.
- **Agent** (the model loops over tools until it's done; see `src/voice/conversation.ts`): use when the number and order of steps truly can't be known ahead of time. Cap the loop, log every tool call, and eval the whole run.

## Selector prompt checklist

- Describe each source by what's in it and what kinds of questions it answers.
- Say what "neither" means (greetings, general knowledge).
- Say what to do when unsure (search; a wasted search is cheap).
- Only ask a clarifying question when the intent is truly unclear.
- Use the cheapest model (`config.routerModel`).

## Adding a source

1. Write the specialist: one function, one source, returns text.
2. Add a boolean to `PlanSchema` with a `.describe()` that says when to use it.
3. Describe the source in `SELECTOR_PROMPT`.
4. Wire it into the orchestrator.
5. Add routing eval cases (should route here, should not route here).

## SQL specialist rules

- Open the connection read-only, and use a read-only database user in production.
- `assertReadOnly`: a single SELECT, nothing else.
- Ground the prompt with distinct values from the columns users talk about. The schema says a column exists, not what's in it.
- When a query comes back wrong, fix the grounding or the prompt. Don't add a hand-written function per question.

## Follow-up questions

Preferred: have the selector rewrite the follow-up into a standalone question using the last few
turns, so every step after it stays stateless.

## Before you're done

- `traced()` on every step.
- Routing evals for each source, plus "neither" and "both" cases.
- No code comments.
