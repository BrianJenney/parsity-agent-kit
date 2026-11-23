# Voice Agent: Put the RAG Pipeline on the Phone

This is the same agent I'd build for a client, stripped down so you can read all of it in one sitting.
It answers the phone for a fake plumbing company (Northwind Plumbing, the `support-faq.md` sample),
looks up answers with the RAG pipeline you already built, takes callback messages, and flags emergencies.

Not enough developers are touching voice. Companies want it, and almost every hard AI engineering
problem shows up in one place: retrieval, tool calling, latency, structured outputs, evals and
human handoff, all inside a few seconds while somebody waits on the line.

## What Retell does (and what you do)

[Retell AI](https://www.retellai.com) is the phone layer. You could stitch this together yourself
(Twilio for calls, Deepgram for speech-to-text, an LLM, ElevenLabs for the voice, plus your own
turn-taking logic), and you'd spend a month on the part that isn't your product.

| Retell handles | You handle |
|---|---|
| Phone numbers, inbound and outbound calls | The prompt: who the agent is and what it will and won't do |
| Speech-to-text and text-to-speech (dozens of voices) | Tools: the HTTP endpoints it calls mid-call (`src/voice/server.ts`) |
| Turn-taking: when to talk, interruptions, "uh-huh" back-channeling | Your data: the docs it searches (`data/samples/support-faq.md`) |
| Running the LLM and calling your tools | What happens after the call (`call_analyzed` webhook) |
| Recordings, transcripts, post-call analysis | Making it not embarrass your client |

You pay Retell per minute of call time, so test in text mode first (below). Check their pricing page
for current rates.

Retell calls this setup a **Retell LLM**: one prompt, with tools attached directly to the LLM.
They also have a visual "conversation flow" builder. Skip it for now. One good prompt plus a few
tools gets you surprisingly far, and it's all code you can diff and review.

## How a call works

```
caller dials your Retell number
  -> Retell transcribes speech, sends it to the LLM with your prompt (src/voice/prompt.ts)
  -> LLM decides to call search_docs
  -> Retell says "One sec, let me check." and POSTs to PUBLIC_URL/tools/search-docs
  -> your server embeds the question, searches Qdrant, returns passages   (src/voice/handlers.ts)
  -> LLM answers from the passages, Retell speaks it
  ...
  -> take_message saves a callback request, end_call hangs up
  -> Retell analyzes the call and POSTs call_analyzed to PUBLIC_URL/webhooks/retell
```

## Files

| File | What it is |
|---|---|
| `src/voice/business.ts` | Everything specific to the business: name, hours, service area, scope, tone. Swap this to make a new agent. |
| `src/voice/prompt.ts` | The prompt, built from the business config. **Read this first.** This is where most of the work is. |
| `src/voice/agent.ts` | Tool definitions, voice settings, and what to extract after every call |
| `src/voice/handlers.ts` | What the tools actually do: RAG search, save a message, log a call |
| `src/voice/server.ts` | Tiny HTTP server Retell calls during the call, plus the webhook after it |
| `src/voice/conversation.ts` | The tool-calling loop behind text mode and the voice evals |
| `src/voice/chat.ts` | Text-mode phone call: same prompt, same tools, no Retell, no minutes billed |
| `src/voice/deploy.ts` | Creates or updates the agent in Retell |
| `src/voice/call-me.ts` | Has the agent call your phone |

## Run it

### 1. Text mode first (free-ish, just OpenAI tokens)

Ingest the docs if you haven't (see the README), then:

```bash
npm run ingest -- data/samples --reset
npm run voice:chat
```

Try to break it: ask about the refund policy, say your basement is flooding, give it a weird name,
ask it to fix your car, ask what it costs to replace a toilet (not in the docs, so it should offer a
callback instead of guessing). Every time it does something dumb, fix the prompt and run it again.
That loop is 90% of the job.

### 2. Put it on a phone

1. Sign up at [retellai.com](https://www.retellai.com), grab an API key, and add it to `.env` as `RETELL_API_KEY`.
2. Set `AGENT_API_SECRET` in `.env` to any long random string. Retell sends it with every tool call so randos can't hit your endpoints.
3. Start the tool server: `npm run voice:server`
4. Expose it to the internet in another terminal: `npx cloudflared tunnel --url http://localhost:3030` (or `ngrok http 3030`). Put the https URL in `.env` as `PUBLIC_URL`.
5. Deploy: `npm run voice:deploy`. Run it again any time you change the prompt or tools. It updates the existing agent instead of creating duplicates.
6. Talk to it: open the agent in the Retell dashboard and hit **Test** to talk in your browser. Or buy a number in the dashboard, put it in `.env` as `RETELL_PHONE_NUMBER`, deploy again, and call it. `npm run voice:call -- +1YOURNUMBER` has it call you.

Callback messages land in `voice-messages.jsonl`, analyzed calls in `voice-calls.jsonl`. In production
those go to a CRM, a text to the owner, or a Slack channel.

> The tunnel URL changes every time you restart cloudflared. New URL = update `PUBLIC_URL` and deploy again.
> For anything past a demo, deploy the server (Vercel, Render, Fly) and use that URL.

## What I learned the hard way

My first voice client was a mobile mechanic in Pennsylvania. It took about twice as long as I
planned, and almost none of the delay was "AI" problems. It was edge cases: prank calls, background
noise from a shop, callers who ramble, names the speech-to-text mangled, a caller hanging up because
the agent took two seconds too long to answer. None of that shows up in a weekend project. All of it
shows up in week one with a paying customer. The prompt in `prompt.ts` is basically that list of
scars:

- **Disclose that it's an AI and that the call is recorded, up front.** It's the law in a lot of places (California needs everyone's consent to record), and people are way less annoyed when you're honest about it.
- **Never say the caller's name back.** Speech-to-text will turn "Morris" into "Maurice," and nothing screams robot louder.
- **One question per turn.** People on the phone can't scroll back up.
- **Make it look things up instead of remembering.** The model will confidently invent a price. `search_docs` plus "never answer pricing from memory" stops that. A score threshold means "I'm not sure, I'll have someone call you" instead of a hallucination.
- **Cover tool latency.** `speak_during_execution` makes it say "one sec, let me check" while your server works. Silence on a phone call feels broken after about a second. Keep tool responses small and fast (watch the ms numbers the server logs).
- **Always hang up.** An agent that says bye and then sits on the line breathing at people is a bad look. `end_call` in the prompt and the tools.
- **Spam is real.** Some of your calls will be people selling SEO. The prompt ends those fast.
- **Turn down the noise.** `denoising_mode` in `agent.ts` filters background chatter. Without it, the agent answers the TV.
- **Extract structured data after every call.** `post_call_analysis_data` in `agent.ts` turns every transcript into fields you can count. `docs_missing_answer` is the most useful one: it tells you exactly what to add to the docs next.

## Outbound calls

`voice:call` is for calling yourself. Calling other people with an AI voice needs their prior
consent in the U.S., an upfront disclosure, a way to opt out, and calling-hour limits. Don't build a
robocaller.

## Make it yours

1. **Change the business.** Edit `business.ts`, drop the business's actual FAQ into `data/`, set `VOICE_DOCS_SOURCE`, ingest, and test in text mode. That's a demo you can show a business owner tomorrow.
2. **Book appointments.** Retell has built-in Cal.com tools (`check_availability_cal`, `book_appointment_cal`). Swap them in for "the owner confirms times on the callback."
3. **Text the owner.** In the `call_analyzed` webhook, send an SMS (Twilio) when `is_emergency` is true.
4. **Write evals.** `npm run evals:voice` replays scripted calls (in `src/evals/cases.ts`) and checks tool calls, emergency flags and phrases. Turn every call that went wrong into a new case and run it on every prompt change. See `curriculum/06-evals.md`.
5. **Speed to lead.** Flip it outbound: a form submission triggers a call within 60 seconds (with consent). See `PROJECTS.md`.
6. **Do it at your company.** Who answers the phone after hours? Who answers the same 30 questions every week? Start there.
