# Parsity Agent Kit: RAG, Structured Outputs & SQL

A free, hackable starter from Brian Jenney ([Parsity](https://parsity.io/ai-dev)).

It's the pipeline behind almost every production RAG app and agent:

```
text -> chunk -> embed (OpenAI) -> store (Qdrant + metadata) -> retrieve -> rerank -> answer (structured output)
```

It also includes the two things most tutorials skip: **filling out a form with structured outputs**,
and **asking whether you even need a vector database** (sometimes you just need SQL).

## Quickstart (~5 minutes)

You need Node 20+, Docker, and an OpenAI API key (a $5 credit goes a long way).

```bash
git clone https://github.com/BrianJenney/parsity-agent-kit.git
cd parsity-agent-kit
npm install
cp .env.example .env          # add your OPENAI_API_KEY
npm run db:up                 # starts Qdrant locally -> http://localhost:6333/dashboard

npm run chunks -- data/samples/municipal-code.md     # preview chunks (free, no API calls)
npm run ingest -- data/samples --reset               # chunk + embed + store
npm run query -- "how late can I run a leaf blower on Sunday?"
npm run query -- "what's the refund policy?" --source support-faq.md --rerank
```

Form filling and SQL:

```bash
npm run fill-form                      # messy email -> typed form JSON
npm run sql:seed                       # creates jobs.db (60 fake AI job postings)
npm run sql:ask -- "average max salary for remote roles by city"
```

## What's in here

| File | What it teaches |
|---|---|
| `src/chunkers.ts` | 4 chunking strategies: fixed, paragraph, sentence, markdown-by-heading. **Start here.** |
| `src/inspect-chunks.ts` | Look at your chunks *before* paying to embed them |
| `src/ingest.ts` | Batch embeddings, Qdrant collection setup, payload indexes, metadata |
| `src/query.ts` | Vector search, metadata filters, score thresholds, over-fetch + rerank, cited answers, human-in-the-loop flag |
| `src/fill-form.ts` | Structured outputs with Zod: the schema *is* the form |
| `src/sql/ask.ts` | Text-to-SQL with read-only guardrails, for when vectors are the wrong tool |
| `PROJECTS.md` | What to build, starting inside your own company |
| `DATA_SOURCES.md` | Where to find data, easy mode and hard mode |

## The loop you should actually do

1. Drop your own text into `data/` (or scrape something with Firecrawl / Crawl4AI).
2. `npm run chunks -- data/yourfile.md` and read the chunks. Would *you* be able to answer a question from one chunk?
3. Change `CHUNK_STRATEGY` / `CHUNK_SIZE` in `.env`, or write a new strategy in `chunkers.ts`.
4. `npm run ingest -- data/yourfile.md --reset` and query it.
5. Retrieval bad? Go back to step 2. **You'll spend more time on chunking and metadata than on prompts.** That's normal.

## Concepts in 60 seconds

**Chunking:** splitting documents into retrievable pieces. Too big and the embedding gets mushy and
you waste context. Too small and the chunk loses meaning. Split on the document's natural structure
(sections, paragraphs) whenever you can.

**Embeddings:** text converted into a vector (here, 1536 numbers) so "similar meaning" becomes
"close in space." The vector size must match your collection. Change models = re-embed everything.

**Metadata:** everything you store next to the vector: source, section, date, author, customer ID.
It lets you filter ("only this customer's docs"), cite sources, and debug. Most bad RAG apps skimp here.

**Reranking:** vector search finds text that *sounds* like the question. A reranker reads the question
and each candidate together and scores actual relevance. Pattern: over-fetch 20, rerank, keep 5.
Use a dedicated reranker (Cohere, Voyage, cross-encoders) in production; this repo uses an LLM to show the idea.

**Score threshold:** if nothing is similar enough, return nothing. "I don't know" beats a confident hallucination.

**Structured outputs:** the model must return JSON that matches your schema. That's how LLM output
becomes something code can trust: saved to a DB, posted to an API, used to fill a form.

**Human in the loop:** when confidence is low or a field is missing, ask a person. That's the
difference between a demo and something a company will put in front of customers.

## Which vector DB?

| | Pick it when |
|---|---|
| **pgvector** | You're already on Postgres. Fewest moving parts. Honestly the right default for many teams. |
| **Pinecone** | Fully managed, zero ops, fast to start. You pay for the convenience. |
| **Qdrant** | You need heavy metadata filtering and want open source you can self-host or run in their cloud. (Used here.) |
| **Weaviate** | You want hybrid search (keyword + vector) and built-in modules out of the box. |

All of them do the core job. Pick one, learn the concepts, and swapping later is a weekend.

## Do you even need a vector DB? An LLM?

- Counting, averaging, sorting, exact filters, dates? **SQL.** (`src/sql/ask.ts`)
- Exact keyword or ID lookups? **Full-text search** (Postgres `tsvector`, BM25).
- Rule-based routing with 5 known categories? Maybe an **if statement**.
- Fuzzy "find me things like this" over unstructured text? **Now** you want vectors.

## Next steps

- Add LangSmith tracing (`LANGSMITH_TRACING=true` + their OpenAI wrapper) to see cost and latency per step.
- Write 20 eval questions with expected answers and run them every time you change chunking or prompts.
- Turn `query.ts` into an agent: let the LLM decide *which* tool to call (vector search vs SQL vs web search).
- Pick a project from `PROJECTS.md` and take it all the way to production.

---

Want to go deeper with a senior engineer who's shipped this stuff in production?
**[parsity.io/ai-dev](https://parsity.io/ai-dev)** (and yes, your company's learning budget can pay for it).
