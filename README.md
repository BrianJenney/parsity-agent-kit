# Parsity Agent Kit

Learn AI engineering by building it, with your coding agent as the coach.

This repo covers the stuff companies hiring AI engineers actually ask about: chunking, RAG and vector
search, text-to-SQL, agentic retrieval, structured outputs, human in the loop, evals, observability
and voice agents. It's built by Brian Jenney ([Parsity](https://parsity.io/ai-dev)) from the patterns
he uses in production. Treat it as a starting point, not the one right way.

## How to use it

Open this folder in Claude Code, Cursor, Codex or whatever agent you use, and say:

> I want to learn AI engineering with this repo. Start the course.

The agent reads `AGENTS.md`, sets you up, asks what you do and why you're here, and walks you through
`curriculum/` one module at a time. It's set up to coach you, not do it for you: it'll ask you
questions, have you poke holes in the code, and make you pick an approach before it helps you build.
Your progress is saved in `.learning/progress.md`, so you can pick up later.

The repo also ships skills (`.claude/skills/`) your agent can use on your own projects afterward:
chunking strategy, structured output agents, agentic retrieval, human in the loop, evals,
observability, voice agents, and scoping a project at work.

## The path

| # | Module | You'll build |
|---|---|---|
| 00 | [Start](curriculum/00-start.md) | Setup, your goal, the data at your job |
| 01 | [Data and chunking](curriculum/01-data-and-chunking.md) | Your own chunker for the entire King James Bible |
| 02 | [Retrieval](curriculum/02-retrieval.md) | Metadata filters, thresholds, reranking, and SQL for when vectors are wrong |
| 03 | [Structured outputs and prompts](curriculum/03-structured-outputs-and-prompts.md) | LLM output your code can trust |
| 04 | [Agentic retrieval](curriculum/04-agentic-retrieval.md) | A router that picks SQL, vectors, both or neither |
| 05 | [Human in the loop](curriculum/05-human-in-the-loop.md) | An agent that proposes refunds and a human who approves |
| 06 | [Evals](curriculum/06-evals.md) | A test suite with LLM-as-judge and Jev, plus regression tracking |
| 07 | [Observability](curriculum/07-observability.md) | LangSmith traces for cost, latency and failures |
| 08 | [Voice](curriculum/08-voice.md) | The agent answering a phone line on Retell |
| 09 | [Your project](curriculum/09-your-project.md) | A scoped proof of concept for your own company |

## Quickstart (if you want to poke around first)

Needs Node 22+, Docker, and an OpenAI API key (a $5 credit covers the whole course).

```bash
git clone https://github.com/BrianJenney/parsity-agent-kit.git
cd parsity-agent-kit
npm install
cp .env.example .env                  # add your OPENAI_API_KEY
npm run db:up                         # Qdrant -> http://localhost:6333/dashboard
npm run sql:seed                      # jobs.db: 60 fake AI job postings
npm run ingest -- data/samples --reset

npm run agent -- "how many jobs are in Austin, and what's Northwind's diagnostic fee?"
npm run evals -- --judge none
npm run voice:chat
```

Every command is listed in `AGENTS.md`.

## What's in here

| Path | What it is |
|---|---|
| `AGENTS.md` | Instructions for your coding agent: how to coach you, the path, conventions |
| `curriculum/` | The modules |
| `.claude/skills/` | Skills your agent can reuse on your own projects |
| `src/chunkers.ts`, `src/ingest.ts` | Chunking strategies, embedding, storage |
| `src/rag.ts`, `src/query.ts` | Retrieve, rerank, answer with citations |
| `src/sql/` | Read-only text-to-SQL with grounding |
| `src/llm.ts` | Structured outputs with Zod |
| `src/agent/` | Selector, SQL and document search, aggregator |
| `src/hitl/` | Propose, hard rules, human approval |
| `src/evals/` | Eval cases, LLM and Jev judges, runner |
| `src/observability.ts` | LangSmith tracing |
| `src/voice/` + `VOICE.md` | Retell phone agent |
| `src/bible/` | The chunking challenge |
| `PROJECTS.md`, `DATA_SOURCES.md` | What to build, where to get data |

---

Want to go deeper with a senior engineer who's shipped this in production?
**[parsity.io/ai-dev](https://parsity.io/ai-dev)** (and yes, your company's learning budget can pay for it).
