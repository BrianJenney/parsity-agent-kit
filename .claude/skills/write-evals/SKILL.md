---
name: write-evals
description: Write and run evals for an AI system with deterministic checks, an LLM judge and an optional Jev judge, tracking regressions between runs. Use after any prompt, model, chunking or retrieval change, or when building any agent.
---

# Write evals

Evals are tests for AI systems: a golden set of inputs, what should be true about the outputs, and
a way to check it. Reference: `src/evals/` (`cases.ts`, `judges.ts`, `run.ts`).

## Order of checks

1. **Deterministic checks first.** Free, fast, never flaky. Structured outputs make these possible:
   - routing booleans (`plan.useSql === true`)
   - enums and flags (`needsHuman`, `action === "escalate"`)
   - tool calls made or not made (voice)
   - must include / must not include (a price, a citation, a caller's name)
   - SQL is a SELECT, citations point at real chunk ids
2. **A judge for what code can't check** (faithfulness, relevance, tone):
   - **LLM as judge:** a bigger model (`config.judgeModel`) scores 0-10 against a written rubric. Pass at 7. Return `{ score, reasoning }` with `structured()`.
   - **Jev** (`@typesafe-ai/sdk`, needs `TYPESAFE_API_KEY` and Node 22+): typed judgments with probabilities. `noul("question")` gives P(yes) at `answers.x.noul`. `choice("question", { label: "description" })` gives `answers.x.choice`, `.probabilities` and `.confidence`. `score("question", ["level 0", "level 1", ...])` gives `answers.x.score`. Pass `state` as an object with the question, retrieved data and answer. Fast and cheap enough to run on every commit.
3. **Regression tracking.** Save every run. Report what newly failed and what got fixed.

## Writing cases

- Start with 10-20. Cover: the common questions, each route or tool, "should say I don't know," "should escalate," and one prompt-injection attempt.
- Add a case every time something breaks in production or a reviewer corrects the agent.
- Give each case an id, the input, and only the expectations that matter. Don't over-specify wording.
- Prefer `answerIncludes: ["1,650"]` over full-answer string matching.
- Test pieces separately when you can: routing alone, retrieval alone (expected section in the top 3), the final answer.

## Judge the judge

Before trusting a judge, feed it a known-bad answer and confirm it fails. Feed it a known-good one
and confirm it passes. A judge that passes everything is worse than none.

## Running

```bash
npm run evals -- --judge none      # deterministic only
npm run evals                      # + LLM judge
npm run evals -- --judge jev       # + Jev judge
npm run evals -- --only <case-id>
npm run evals:voice
```

Exit code is 1 under `EVAL_PASS_RATE`, so it can gate CI. Run flaky cases 3-5 times and look at
the pass rate rather than one result.

## Cost

Deterministic checks are free beyond running the agent. Judges add a call per case. Run the cheap
suite on every change and the judged suite before deploys or nightly.
