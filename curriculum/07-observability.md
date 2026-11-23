# 07: Observability

## Why this matters

AI systems are non-deterministic and they cost money per call. In production you need to know what
users asked, what the agent did at each step, how long it took, what it cost, and where it failed.
This is where boring old software engineering meets the AI hype. Companies need it even when they
don't know to ask for it.

## Set it up (about 10 minutes)

1. Make a free account at [smith.langchain.com](https://smith.langchain.com) and create an API key.
2. In `.env`:
   ```
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=lsv2_...
   LANGSMITH_PROJECT=parsity-agent-kit
   ```
3. Run anything:
   ```bash
   npm run agent -- "how many jobs are in Austin, and what's Northwind's diagnostic fee?"
   npm run evals -- --judge none
   ```
4. Open the project in LangSmith.

## How it works

Two pieces, both already wired in:

- **`src/config.ts`** wraps the OpenAI client with `wrapOpenAI` when tracing is on. Every model call (prompt, response, tokens, latency) gets logged with no other code changes.
- **`src/observability.ts`** exports `traced(name, runType, fn)`, which wraps a function with LangSmith's `traceable`. The selector, SQL agent, retrieval, rerank, aggregator and the whole agent run are wrapped, so a trace shows the full tree: `agent > selector`, `agent > run_sql > write_sql`, `agent > retrieve`, `agent > aggregator`.

Turn `LANGSMITH_TRACING` off and everything still runs, untraced.

## What to look at

Have them open one trace and answer:

- Which step is slowest? (Usually the aggregator or the reranker.)
- How many tokens did the whole question cost? Which step used the most?
- What exactly did the SQL agent see in its prompt? (The grounding values are in there.)
- For an eval run: which failed case had the weirdest trace?

## Concepts to land

- **Traces, not logs.** A trace connects every step of one request. When an answer is wrong, you walk the tree to find which step went wrong.
- **Cost per request.** Tokens times price, per step. This is the number your manager asks about first.
- **Latency per step.** Users feel the total. You fix the slowest step.
- **Feedback.** Thumbs up or down on an answer, attached to its trace, turns production into a source of new eval cases.

## Coach notes: poke holes

- Traces include the full prompt and retrieved data. What if that data has customer PII? (Mask it before it's sent, or self-host.)
- Tracing is on or off for everything. Would you trace 100% of production traffic? (Sampling.)
- LangSmith isn't the only option. Langfuse is open source, and Helicone works as a proxy. What would make them pick one over another?

## Challenge

Pick one:

1. **Make it faster.** Find the slowest step in a trace. Change one thing (a smaller model, fewer candidates to rerank, skipping rerank when there are 5 or fewer hits) and prove with traces and evals that it got faster without getting worse.
2. **Tag the traces.** Pass metadata (a user id, the eval case id) into the trace so you can filter by it in LangSmith. Then find all traces for one eval case across runs.

## Done when

- They've found the slowest step and the most expensive step in a real trace
- They've finished one challenge option with before and after numbers
