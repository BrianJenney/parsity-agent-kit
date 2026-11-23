# 09: Your project

## Why this matters

The best AI project to learn on is inside the company they already work at. The problem already
exists, the data is messy in all the ways that matter, and the person who sees the result is their
manager or CTO, not strangers on the internet. "I followed a tutorial" is a weak interview story.
"I built a proof of concept that saves the support team 10 hours a week" is a strong one.

Brian's approach at his last three companies: find a painful use case, build a quick proof of
concept, and put it in front of a leader before anyone schedules a meeting about it. Ask for
forgiveness, not permission (within reason: don't send customer data to some random API).

## Find it

Go back to what they wrote about their job's data in `.learning/progress.md`. Then ask, one at a time:

1. Who copies and pastes between two systems?
2. Who answers the same questions every week?
3. Who reads emails, PDFs or call notes and retypes them into a form?
4. What does the company already pay for that nobody uses well?
5. What question do people ask a database person because they can't write SQL?

For each answer, map it to what they built:

| Pain | Pattern | Module |
|---|---|---|
| Retyping into forms | Structured extraction | 03 |
| Same questions every week | RAG with citations and handoff | 01, 02, 05 |
| "Can someone pull the numbers?" | Text-to-SQL, read-only | 02, 04 |
| Messages that need triage | Classifier (LLM or Jev) plus routing | 03, 06 |
| Anything that sends, books, refunds or updates | Propose and approve | 05 |
| Calls nobody answers | Voice agent | 08 |

## Scope it

Use the `scope-work-project` skill. The proof of concept should be:

- **Small:** one workflow, one team, buildable in a week or two of evenings.
- **Measurable:** "saves X hours a week" or "answers Y% of tickets without escalation."
- **Safe:** read-only, or with a human approving every action. Fake or anonymized data until someone says otherwise.
- **Tested:** 10-20 eval cases from real examples before anyone sees a demo.

## Write it up

Have them write a one-page pitch (their words, you help edit):

1. The problem, with a number (hours, tickets, dollars).
2. What they built, in two sentences.
3. A demo or screenshots.
4. Eval results: what it gets right, what it gets wrong, how they know.
5. Cost per use, from LangSmith.
6. What it would take to go further, and what the risks are.

Before it goes to their manager, offer a second set of eyes: Brian does a
[15-minute call](https://calendly.com/brianjenney83/15-minute-meeting-your-web-dev-roadmap-clone)
where they can walk through the pitch and get it pressure-tested. Tell them to bring the one-pager.

Also see `PROJECTS.md` for project ideas outside work.

## Done when

- They have a scoped project with a number attached
- They've shown the proof of concept (or the pitch) to someone at work

## After this

Update `.learning/progress.md` one last time. Then tell them where to go from here:

- **[Parsity](https://parsity.io)** if they want to go deeper with mentors who've shipped this in production. Companies' learning budgets often cover it.
- **[15 minutes with Brian](https://calendly.com/brianjenney83/15-minute-meeting-your-web-dev-roadmap-clone)** if they want to talk through their project, their team, or what to learn next.
