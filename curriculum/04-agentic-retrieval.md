# 04: Agentic retrieval

## Why this matters

Real questions don't arrive labeled "this one's for SQL." Agentic retrieval means an LLM decides
which tools to use, rewrites the query for each one, and a final step answers only from what came
back. It's the pattern behind most production AI search and chat.

## Agent or workflow?

Ask them first: what's the difference?

- **Workflow:** your code decides the steps. An LLM fills in one or two of them (classify this, write this SQL, summarize this).
- **Agent:** the LLM decides the steps, in a loop, calling tools until it thinks it's done.

`src/agent/` is a workflow with an LLM router. `src/voice/conversation.ts` is closer to an agent:
the model calls tools in a loop until it decides to stop. Ask which one they'd rather debug at 2am.
Most companies that say "we need an agent" need a workflow. Having an opinion on this (and being
able to defend it) puts them ahead of most people in an interview.

## Run it

```bash
npm run agent -- "how many remote AI Engineer jobs are there?"
npm run agent -- "can I run a leaf blower at 9am on Sunday?"
npm run agent -- "how many jobs are in Austin, and what's Northwind's diagnostic fee?"
npm run agent -- "hey what's up"
npm run agent -- "how much does Northwind charge to replace a toilet?"
```

Before each, ask: which sources will it pick?

## How it works

```
question
  -> selector (structured output: useSql, useRag, reason, searchQuery, clarifyingQuestion)
  -> SQL agent and/or document search, in parallel (each returns text)
  -> aggregator (structured output: answer, sources, citations, confidence, needsHuman)
```

Walk through the files in this order:

1. `src/agent/selector.ts`: the selector only routes. It doesn't extract filters or answer anything. Read `SELECTOR_PROMPT` together. Note "when unsure, search the documents": a wasted search is cheap, a missed answer isn't.
2. `src/agent/index.ts`: the orchestrator. Plain TypeScript decides what runs. `Promise.all` runs SQL and search at the same time.
3. `src/sql/agent.ts`: the SQL agent writes the query. There's no hand-written query builder, on purpose. When a query is wrong, fix the grounding or the prompt, not by adding a function per question.
4. `src/agent/aggregator.ts`: the only step that talks to the user. It answers from retrieved data or says it can't.

## Concepts to land

- **One job per agent.** A "god agent" that routes, searches, writes SQL and summarizes in one prompt is slow, expensive, and impossible to test. Small agents with typed inputs and outputs are testable one at a time.
- **Query rewriting.** `searchQuery` is the question cleaned up for search. Users type "airbnb rules??" The vector store does better with "short-term rental permit requirements."
- **Cheap model to route.** Routing is a small decision. `ROUTER_MODEL` can be the cheapest model you have. Save the expensive one for where it changes the answer.
- **The aggregator is grounded.** If retrieval came back empty, it says so and sets `needsHuman`.

## Coach notes: poke holes

- The selector has no conversation history. Ask "how many jobs in Seattle?" then "what about Austin?" What happens?
- The selector's data-source descriptions are hand-written. What happens when someone adds a third document and forgets to update the prompt?
- SQL and document search always run in parallel when both are picked. When would you want them in sequence instead? (When the SQL result decides what to search for.)
- There's no retry when the SQL agent writes a query that errors. Should there be? How many times?
- `runAgent` returns everything (plan, SQL, hits, answer). Why is that useful? (Evals and debugging. Module 06.)

## Challenge: follow-up questions

Make this work:

```bash
npm run agent -- "how many remote jobs are in Seattle?"
# then, in the same conversation:
"what about Austin?"
```

Right now each run is a fresh question. Ask them how they'd approach it before writing anything:

- Where does history live? (An array of `{ role, content }` passed into `runAgent`.)
- Who needs it? The selector, to resolve "what about Austin." The SQL agent? The aggregator?
- How much history? All of it, or the last 5 turns? What does each cost?
- Should the selector rewrite the follow-up into a standalone question ("how many remote jobs are in Austin?") so the downstream agents don't need history at all?

That last option is the one Brian usually picks. It keeps every agent after the selector stateless.
Let them decide. Then build a small REPL (`src/agent/chat.ts`) that keeps history between questions.

Stretch: add a third source. Ingest a document from their job (or any markdown file), update
`SELECTOR_PROMPT`, and add an eval case for it in module 06.

## Check yourself

1. Workflow or agent: which is this, and why is that the right call here?
2. Why does the selector only route?
3. What happens when both SQL and documents come back empty?

## Done when

- Follow-up questions work in their REPL
- They can draw the flow from memory
