---
name: scope-work-project
description: Turn "I want to do something with AI at work" into a small, measurable, safe proof of concept and a one-page pitch. Use in module 09 or whenever a developer asks what to build at their job.
---

# Scope a work project

## Find the pain (ask one at a time)

1. Who copies and pastes between two systems?
2. Who answers the same questions every week?
3. Who retypes emails, PDFs or call notes into a form?
4. What question do people ask a database person because they can't write SQL?
5. What calls or messages go unanswered?

Get a number for each: hours a week, tickets a month, dollars.

## Map it to a pattern

| Pain | Pattern |
|---|---|
| Retyping into forms | Structured extraction (`src/fill-form.ts`) |
| Repeat questions | RAG with citations and human handoff (`src/rag.ts`, `src/agent/`) |
| "Pull the numbers for me" | Read-only text-to-SQL (`src/sql/`) |
| Triage and routing | Classifier with structured output or Jev |
| Sends, books, refunds, updates | Propose and approve (`src/hitl/`) |
| Unanswered calls | Voice agent (`src/voice/`) |

## Scope rules

- One workflow, one team. If it needs three integrations, cut two.
- Read-only, or every action approved by a person.
- Anonymized or fake data until someone with authority says otherwise. Never send customer data to an API the company hasn't approved.
- 10-20 eval cases from real examples before the first demo.
- Traced, so you can answer "what does it cost per use?"

## The pitch (one page, in their words)

1. Problem and the number.
2. What it does, in two sentences.
3. Demo or screenshots.
4. Eval results: what it gets right and wrong.
5. Cost per use.
6. Risks and what it would take to go further.

Show it to a manager or tech lead early. A rough proof of concept in front of a leader beats a
perfect plan in a doc nobody reads.
