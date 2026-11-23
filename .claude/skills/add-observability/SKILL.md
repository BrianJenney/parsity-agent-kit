---
name: add-observability
description: Add LangSmith tracing to an AI app so every model call and agent step shows prompts, tokens, cost and latency. Use when setting up a project, debugging a wrong answer, or reducing cost or latency.
---

# Add observability (LangSmith)

## Setup

1. Free account at smith.langchain.com, create an API key.
2. `.env`: `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY=...`, `LANGSMITH_PROJECT=<name>`.
3. `npm install langsmith`.

## Two pieces

**Wrap the model client once** so every call is traced with no other changes (see `src/config.ts`):

```ts
import { wrapOpenAI } from "langsmith/wrappers";
const client = tracingEnabled ? wrapOpenAI(new OpenAI()) : new OpenAI();
```

**Wrap each step** so traces show a tree, not a flat list of calls (see `src/observability.ts`):

```ts
import { traceable } from "langsmith/traceable";
export const select = traceable(async (question: string) => { ... }, { name: "selector", run_type: "chain" });
```

Use `run_type` `"retriever"` for search, `"tool"` for tools, `"chain"` for agent steps. Name steps
the way you'd say them out loud.

## What to look at

- The slowest step (fix that one first)
- Tokens and cost per request, and which step uses the most
- The exact prompt a step saw, including retrieved data and grounding
- Failed and errored runs
- Traces for eval runs, to see why a case failed

## Production concerns

- Traces include prompts and retrieved data. Mask PII before it leaves, or self-host (Langfuse is an open-source option).
- Sample traffic if volume is high.
- Attach user feedback (thumbs up or down) to traces and turn the bad ones into eval cases.
