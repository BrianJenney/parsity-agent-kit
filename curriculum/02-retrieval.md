# 02: Retrieval

## Why this matters

Vector search finds text that *sounds* like the question. That isn't the same as text that
*answers* it. Most of the work in a RAG system is closing that gap: metadata filters, thresholds,
reranking, and knowing when vectors are the wrong tool entirely.

## Run it

```bash
npm run ingest -- data/samples --reset
npm run query -- "how late can I run a leaf blower on Sunday?"
npm run query -- "what's the refund policy?" --source support-faq.md
npm run query -- "how much to replace a toilet?" --threshold 0.4
npm run query -- "can I rent my house on Airbnb?" --rerank
```

Before each one, ask them to predict which chunk comes back first.

Then walk through `src/rag.ts`: `retrieve` (embed the question, vector search, optional metadata
filter and score threshold), `rerank` (over-fetch, let an LLM re-score, keep the best), and
`answerFromContext` (structured answer with citations and a `needsHuman` flag).

## Concepts to land

- **Embeddings:** text turned into a list of numbers (1,536 here) so "similar meaning" becomes "close together." The collection's vector size has to match the model. Change embedding models and you re-embed everything.
- **Metadata filters:** "only search this customer's docs" is a filter, not a hope. Filters are hard rules. Similarity is a suggestion.
- **Score threshold:** if nothing is similar enough, return nothing. "I don't know" beats a confident hallucination.
- **Over-fetch and rerank:** grab 20, score them more carefully, keep 5. A dedicated reranker (Cohere, Voyage, a cross-encoder) is faster and cheaper than the LLM reranker here. The repo uses an LLM so you can read exactly what it does.
- **Citations:** the answer says which chunk ids it used. That's how you debug, and how a user decides whether to trust it.

## Do you even need vectors?

This is the question that separates people who've shipped this from people who watched a tutorial.
Ask them which tool fits each question before you tell them:

| Question | Tool |
|---|---|
| "How many remote jobs pay over $150k?" | **SQL.** Counting, averaging, sorting, exact filters, dates. Vectors are bad at all of these. |
| "Find ticket #48213" or an exact error code | **Full-text search** (Postgres `tsvector`, BM25). |
| "Is this email a refund request, a complaint or spam?" | **A classifier** (an LLM with structured output, or Jev). No retrieval at all. |
| "What does our policy say about returning opened items?" | **Vectors.** Fuzzy meaning over unstructured text. |
| "Which customers complained about shipping in Texas last month?" | **Both:** SQL for Texas and last month, vectors for "complained about shipping." |

Then have them try the SQL path:

```bash
npm run sql:ask -- "average max salary for remote roles by city"
npm run sql:ask -- "how many jobs mention qdrant?"
```

Open `src/sql/agent.ts`. Point out the two guardrails: the database is opened read-only, and
`assertReadOnly` refuses anything but a single `SELECT`. Then the grounding: the prompt includes the
real job titles and cities from the table. Ask why. (The schema says a column exists, not what's in
it. Without grounding, "AI engineer jobs in the Bay Area" returns a confident zero rows.)

## Coach notes: poke holes

- `retrieve` uses one embedding model for questions and documents. Questions and documents are written very differently. What's hybrid search, and when would it help?
- The default threshold in `npm run query` is none. Run a nonsense question and see what comes back.
- The LLM reranker sends every candidate's full text in one call. What happens to cost and latency at k=50?
- `assertReadOnly` is a regex. What's the second line of defense in production? (A database user that only has read permissions.)
- Text-to-SQL on 60 rows is easy. What breaks at 200 tables? (The model can't hold the schema. You pick the relevant tables first, or expose a few views.)

## Which vector database?

| | Pick it when |
|---|---|
| **pgvector** | You're already on Postgres. Fewest moving parts. The right default for a lot of teams. |
| **Pinecone** | Fully managed, zero ops. You pay for the convenience. |
| **Qdrant** | Heavy metadata filtering, open source, self-host or cloud. (Used here.) |
| **Weaviate** | Hybrid search and built-in modules out of the box. |

They all do the core job. Pick one, learn the concepts, and swapping later is a weekend.

## Check yourself

1. Why would a question that's clearly answered in the docs still come back with the wrong chunk?
2. When would you pick SQL over vectors? Give an example from your job.
3. What does a score threshold protect you from?

## Done when

- They've run a query that fails without `--rerank` or `--threshold` and works with it (or explained why it didn't)
- They've sorted 5 questions from their own job into SQL, full-text, classifier, vectors or both
