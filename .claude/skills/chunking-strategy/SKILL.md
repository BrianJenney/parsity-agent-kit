---
name: chunking-strategy
description: Decide how to chunk a corpus for retrieval, or whether to chunk it at all. Use when preparing any documents, transcripts, tickets, code or scraped pages for RAG.
---

# Chunking strategy

## First: should this be chunked?

| Data | Usually |
|---|---|
| Fits comfortably in the prompt (a short FAQ, one policy) | Don't chunk. Put it in the prompt. Revisit if cost or latency hurts. |
| Rows in a database | Don't embed. Query it with SQL. Embed only free-text columns you need to search by meaning. |
| Naturally separate units (tickets, emails, reviews, products) | One unit per chunk. Split only units that are too long. |
| Long structured docs (manuals, legal codes, wikis) | Split by heading, then pack paragraphs up to a size. Keep the heading as metadata. |
| Long unstructured text (transcripts, books) | Split on sentences or speaker turns, pack to a size, add overlap. |

## Then: answer these before writing code

1. What's the smallest unit that means anything on its own? (A verse, a ticket, a section.) Never split it.
2. What boundaries must a chunk never cross? (Two documents, two customers, two books.)
3. What will a user search for, and does one chunk contain enough to answer it?
4. Target size: start around 500-1,000 characters for prose. Measure, don't guess.
5. Overlap: needed when ideas run across boundaries (prose, transcripts). Usually not needed when units are self-contained (tickets, verses packed with clean boundaries).
6. Metadata: what does a user need to see in a citation, and what will you filter on? Source, section or heading, date, author, customer or tenant id, and the strategy that produced the chunk.
7. Should the heading or title be prepended to the chunk text? It helps the embedding know the context. It costs tokens.

## Process

1. Preview before paying: `npm run chunks -- <file>` (or write a preview for the new corpus).
2. Read 10 random chunks. Could you answer a question from each one alone?
3. Audit: count chunks that start mid-word, end mid-sentence, are under 100 characters, or lack metadata. `src/bible/audit.ts` is a template.
4. Ingest a small sample (`--limit`), check metadata in the vector DB dashboard, then ingest everything.
5. Compare strategies with retrieval evals (`write-evals` skill), not gut feel.

## Patterns in this repo

- `src/chunkers.ts`: fixed, paragraph, sentence, markdown-by-heading, plus a greedy `pack()` helper.
- `src/bible/`: structure-aware chunking with references, an audit script, and ingest of any chunks `.jsonl`.

## Upgrades when the basics aren't enough

- **Parent-child:** embed small chunks, return the larger parent section to the LLM.
- **Semantic chunking:** start a new chunk where embedding similarity between neighboring sentences drops.
- **Hybrid search:** add keyword search (BM25) for exact terms, IDs and error codes.
