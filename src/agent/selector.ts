import { z } from "zod";
import { config } from "../config.js";
import { structured } from "../llm.js";
import { traced } from "../observability.js";

export const PlanSchema = z.object({
  useSql: z.boolean().describe("true when the question needs counts, averages, sorting, filters or exact values from the jobs table"),
  useRag: z.boolean().describe("true when the question needs the documents: city code rules or the plumbing company's policies"),
  reason: z.string().describe("One sentence on why you picked these sources"),
  searchQuery: z
    .string()
    .nullable()
    .describe("If useRag is true: the question rewritten as a clean search query, spelling fixed. Otherwise null."),
  clarifyingQuestion: z
    .string()
    .nullable()
    .describe("If the question is too vague to route, the one question you'd ask the user. Otherwise null."),
});

export type Plan = z.infer<typeof PlanSchema> & { needsSearch: boolean };

export const SELECTOR_PROMPT = `You route questions to the right data source. You do not answer them.

DATA SOURCES
1. SQL database (jobs.db): a table of AI job postings with title, company, city, remote (0/1), salary_min, salary_max, skills, posted_at.
   Use it for anything about jobs: counts, averages, "highest", "how many", filters by city, skill, salary or date.
2. Document store (vector search) with two documents:
   - The City of Riverbend municipal code: noise rules (leaf blowers, construction), short-term rentals, sidewalk vending, penalties.
   - Northwind Plumbing's customer FAQ: scheduling, pricing, warranty, refunds, service area.
   Use it for questions about rules, policies, hours and fees in those documents.

RULES
- Pick SQL, documents, both, or neither.
- Neither: greetings, small talk, or general knowledge that isn't about these sources ("what is RAG?").
- Both: the question clearly needs a fact from each source.
- When you're unsure whether the documents cover it, search them. Searching and finding nothing is cheap. Missing an answer isn't.
- Only ask a clarifying question when you truly can't tell what they want.`;

export const select = traced("selector", "chain", async (question: string): Promise<Plan> => {
  const plan = await structured({
    schema: PlanSchema,
    name: "plan",
    model: config.routerModel,
    system: SELECTOR_PROMPT,
    user: question,
  });
  return { ...plan, needsSearch: plan.useSql || plan.useRag };
});
