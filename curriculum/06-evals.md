# 06: Evals

## Why this matters

Evals are tests for AI systems. Change one prompt to fix a bug and you can quietly break five other
questions you never re-checked. Brian learned this the hard way: he updated a pile of prompts with a
CEO to fix some scenarios, didn't re-test the rest, and the next day another exec asked a curveball
question in a demo and the agent fell on its face. An eval suite would have caught it in a minute.

Models also change under you. Providers update them, you switch to a cheaper one, a teammate edits a
prompt. Evals are how you know whether it still works.

## Run it

```bash
npm run ingest -- data/samples --reset
npm run sql:seed
npm run evals -- --judge none     # free-ish: deterministic checks only
npm run evals                     # adds an LLM judge (a few cents)
npm run evals -- --judge jev      # Jev as the judge (needs TYPESAFE_API_KEY)
npm run evals -- --only toilet-not-in-docs
npm run evals:voice               # voice agent scenarios
```

Each run saves to `evals-results/` and tells you what regressed or got fixed since the last run.
The process exits with code 1 under the pass rate (`EVAL_PASS_RATE`, default 0.8), so the same
command can gate a deploy in CI.

## How it works

Open `src/evals/cases.ts`. Each case is a question plus what should be true about the result:

```ts
{
  id: "toilet-not-in-docs",
  question: "how much does Northwind charge to replace a toilet?",
  expect: { useRag: true, needsHuman: true, answerExcludes: ["$"] },
}
```

Then `src/evals/run.ts` runs the whole agent on every case and checks, in order:

1. **Deterministic checks first.** Did it route to the right sources? Did it set `needsHuman`? Does the answer contain the number it should, and avoid the thing it shouldn't? These are free, fast and never flaky. Structured outputs are what make them possible: you can assert on `plan.useSql` because it's a boolean, not a paragraph.
2. **A judge for what code can't check.** Is the answer actually grounded in what was retrieved? `src/evals/judges.ts` has two:
   - **LLM as judge** (`llmFaithfulness`): a bigger model (`JUDGE_MODEL`) scores the answer 0-10 against a rubric. 7 or above passes. It works well and costs money every run, since you're calling a model to grade a model.
   - **Jev** (`jevFaithfulness`): TypeSafe's Jev model is built for exactly this kind of judgment. Instead of generating text, it answers typed questions with probabilities: `noul` for yes/no (the probability it's yes), `choice` to pick from labels you define, `score` for a rubric. The SDK (`@typesafe-ai/sdk`) types the answers from your questions, so `answers.grounded.noul` is a number your code can threshold. It's fast and cheap, which matters when you run evals on every commit.
3. **Regression tracking.** The last run is saved, so "fixed 2, broke 1" shows up immediately.

The voice suite (`voiceCases`) works the same way but scripts a whole phone call, then checks which
tools were called, whether an emergency got flagged, and whether the agent ever said the caller's name.

## Concepts to land

- **Golden set:** questions you expect users to ask, with what a good result looks like. Start with 10-20. Add one every time something breaks in production.
- **Test the pieces, not just the end.** Routing is its own eval. Retrieval is its own eval (did the right chunk come back?). The final answer is its own eval. When the end-to-end score drops, the per-step checks tell you where.
- **Deterministic before judges.** If code can check it, code should check it.
- **Judge the judge.** Give the judge an answer you know is wrong and make sure it fails it. An LLM judge that passes everything is worse than no judge.
- **Evals cost money.** Run the cheap suite on every change, the judged suite before a deploy or nightly.

## Coach notes: poke holes

- `answerIncludes: ["4"]` passes if the answer says "4 p.m." It also passes if it says "40 people." Is that check good enough?
- The LLM judge only sees what was retrieved, not the source documents. Can it catch a retrieval miss?
- Twelve cases is a tiny suite. Which important questions are missing?
- LLM output varies between runs. A case that passes 4 times out of 5: is it passing? (Run flaky cases 3-5 times and look at the rate.)
- The Jev judge maps a 3-level score to 0-10. Is that a fair comparison with the LLM judge's 0-10?

## Challenge: break it, then catch it

1. Run `npm run evals` and save the baseline.
2. Ask them to pick one line in `SELECTOR_PROMPT` or `AGGREGATOR_PROMPT` to delete or change. Before running, ask: which cases will fail? Then run it. Were they right?
3. Revert. Now write 5 new cases: 3 for questions the suite doesn't cover, and 2 that should fail today (a question the agent gets wrong). Run them. Fix the agent until they pass without breaking the rest.
4. Judge the judge: add a case with a hand-written wrong answer and check that both the LLM judge and Jev fail it. Which one was more confident? Which was faster and cheaper?

Stretch: add a retrieval eval that checks whether the expected section comes back in the top 3
hits for a question, without calling the aggregator at all.

## Check yourself

1. What's an eval, in one sentence, to a manager?
2. Why run deterministic checks before an LLM judge?
3. When would you use Jev instead of an LLM judge, and when wouldn't you?

## Done when

- They've caught a regression they introduced on purpose
- The suite has at least 5 of their own cases
- They've run both judges and can compare them on speed, cost and agreement
