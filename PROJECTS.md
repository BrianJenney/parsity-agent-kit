# What to Build

**Rule #1: look inside your company first.** Somebody in your building is copy-pasting
between two systems, retyping emails into a form, or answering the same 30 questions
every week. That's your first AI project. It's also the easiest thing to pitch, because
the ROI is "Jane gets 10 hours a week back."

**Rule #2: if it was easy, it wasn't hard enough.** Nobody has ever had an easy time
building a real capstone. The pitfalls (messy data, bad retrieval, cost, latency,
regressions, prompt injection) are the curriculum. Take one idea all the way to
production instead of starting five demos.

---

## Inside your company (start here)

| Project | What it does | Why it sells internally |
|---|---|---|
| **Form filler** | Reads emails/PDFs/call notes, fills the form your team retypes by hand. Missing fields get asked, not guessed. | Pure time savings. Easy to measure. See `src/fill-form.ts`. |
| **Chatbot + human in the loop** | RAG over internal docs that escalates to a person when confidence is low, and learns from the human's answer. | A plain chatbot is table stakes now. One that knows when to hand off is something a company trusts. |
| **Voice AI on top** | Same agent, but it answers the phone: after-hours support, appointment booking, lead qualification. | Not enough developers are touching voice. Speed to lead = money. |
| **Text-to-SQL for ops** | "How many orders shipped late last week by region?" against a read-only replica. | Every ops/finance person wants this. See `src/sql/ask.ts`. |
| **Internal search that cites sources** | Search across wikis, tickets, Slack exports with metadata filters (team, date, doc type). | Onboarding and support teams feel it in week one. |

## Side projects with hard data (portfolio pieces)

1. **Job application agent.** Crawl job boards, match roles to your resume, find the application form, pre-fill it, and stop for your approval before submitting.
2. **Municipal code assistant.** Scrape city codes (start with your own city), chunk by section, and answer "can I build an ADU / run a short-term rental / do construction on Sunday?" with citations. Then do 10 cities and add a `city` metadata filter.
3. **Creator business coach.** Pull transcripts from a creator's YouTube channel, vectorize them, and build a coach that answers in their frameworks and cites the video and timestamp.
4. **Agency email personalizer.** Firecrawl a list of local business websites, extract what each one does and what's broken (no booking, slow site, no reviews widget), and draft a personalized email for a marketing agency.
5. **Long-horizon outbound agent.** Define an ICP, find matching companies and contacts, research each one, send a first email, and follow up on a schedule until they reply, book, or opt out. (Hard parts: state, scheduling, dedupe, deliverability, knowing when to stop.)
6. **Speed-to-lead voice agent.** A web form submission triggers an AI phone call within 60 seconds that qualifies the lead and books a meeting on a calendar.
7. **Research paper explainer.** Ingest arXiv papers in one niche, chunk by section, add metadata (authors, year, citations), and compare methods across papers.
8. **Public records watcher.** Monitor city council agendas or permit filings, summarize what changed, and alert you about the topics you care about.

## Make it production grade (this is the actual learning)

- [ ] Evals: a set of 20–50 questions with expected answers you run on every prompt change
- [ ] Observability: LangSmith (or Helicone / Langfuse) traces for token cost, latency, and failed steps
- [ ] Retrieval tuning: compare chunking strategies with your evals, not your gut
- [ ] Metadata filters + score thresholds so it says "I don't know" instead of hallucinating
- [ ] Reranking, then measure if it actually helped
- [ ] Model routing: cheap model for routing/extraction, bigger model only where needed
- [ ] Provider fallback: if OpenAI is down, can you switch?
- [ ] Prompt-injection defense: scraped data will contain instructions aimed at your agent
- [ ] Deploy it. A URL beats a screenshot.
