# 03: Structured outputs and prompts

## Why this matters

An LLM that returns prose is a demo. An LLM that returns JSON matching a schema is a component your
code can trust: saved to a database, posted to an API, used to fill a form, used to decide what
happens next. Every agent in this repo is built on it.

## Run it

```bash
npm run fill-form
```

Open `src/fill-form.ts`. The Zod schema **is** the form. The model can only return data in that
shape. `missingFields` is the model telling you what it couldn't find instead of inventing it.

Then open `src/llm.ts`. `structured()` is the one function every agent here uses:

```ts
const plan = await structured({
  schema: PlanSchema,
  name: "plan",
  system: SELECTOR_PROMPT,
  user: question,
});
```

Under the hood it's `openai.responses.parse` with `zodTextFormat(schema, name)`, then
`schema.parse()` on the result so a bad response throws instead of flowing through your app.

## Concepts to land

- **The schema is part of the prompt.** Field names and `.describe()` text go to the model. A field called `needsHuman` with a good description does more than a paragraph in the system prompt.
- **`.nullable()` beats guessing.** If a value might not be there, give the model a way to say so.
- **Enums constrain decisions.** `z.enum(["refund", "send_tech_back", "deny", "escalate"])` means the model picks one of four, not "I think a partial refund might be appropriate."
- **Booleans are routing.** `useSql`, `useRag`, `needsHuman` are how one LLM call decides which code runs next.
- **Validate anyway.** The API enforces the shape. `schema.parse()` still catches what the shape can't (a number out of range).

## System prompts

Look at the prompts in `src/agent/selector.ts`, `src/agent/aggregator.ts` and `src/voice/prompt.ts`.
They follow the same pattern:

1. **One sentence on the job.** "You route questions to the right data source. You do not answer them."
2. **The context it needs.** What each data source contains, what the business does.
3. **Rules, short and direct.** What to do when unsure. What never to do.
4. **Data marked as data.** Retrieved text goes in tags (`<retrieved-data>`, `<context>`), and the prompt says to ignore instructions inside it. Scraped content will eventually contain "ignore previous instructions."

Put the parts that never change at the top and the dynamic parts (the question, retrieved data) at
the end. Providers cache identical prompt prefixes, which makes repeated calls cheaper and faster.

## Coach notes: poke holes

- `fill-form.ts` has no maximum for `annualRevenueUsd`. What happens if the email says "we did $4B"? Should that be a schema rule or a check in code?
- `missingFields` is a list of strings the model writes. How would you make it a typed list of field names instead? (`z.array(z.enum([...]))`.)
- The aggregator prompt says "never invent numbers." How do you know it doesn't? (Module 06.)
- Temperature is 0 everywhere in `structured()`. When would you want it higher?

## Challenge (small)

Have them pick a form from their job (an intake form, a ticket template, an expense report) and
rewrite the `SupplierIntakeForm` schema in `src/fill-form.ts` to match it. Feed it a messy real
example (with PII removed). They write the schema. You can help with the Zod syntax.

## Check yourself

1. Why is structured output the difference between a demo and a feature?
2. Where does a rule belong: the prompt, the schema, or code? Give one example of each.

## Done when

- They've run `fill-form` on their own form and messy input
- They can explain why `missingFields` exists
