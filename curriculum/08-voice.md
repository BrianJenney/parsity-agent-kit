# 08: Voice

## Why this matters

Not enough developers are touching voice, and companies want it. Almost every hard AI engineering
problem shows up in one place: retrieval, tool calling, latency, structured data, evals and human
handoff, all inside a few seconds while somebody waits on the line. `VOICE.md` is the deep dive.
This module is the path through it.

## Run it (text mode first)

```bash
npm run ingest -- data/samples --reset
npm run voice:chat
npm run evals:voice
```

`voice:chat` is a phone call in your terminal: same prompt, same tools, no phone, no Retell minutes.
Have them try to break it: ask about refunds, say the basement is flooding, give a weird name, ask
it to fix a car, ask the price of something that isn't in the docs.

## How it works

Read `VOICE.md` together, then the files in this order:

1. `src/voice/business.ts`: everything specific to the business. Swap this file to make a new agent.
2. `src/voice/prompt.ts`: where most of the work is. "How you sound" rules, non-negotiables, emergencies, taking a message, always hang up.
3. `src/voice/agent.ts`: tool definitions, voice settings, and what to extract after every call.
4. `src/voice/conversation.ts`: the text simulator. This is a real tool-calling loop: the model calls tools until it decides it's done.
5. `src/voice/server.ts`: what Retell calls during a live call.

Then put it on a phone with Retell by following `VOICE.md` (`voice:server`, a tunnel, `voice:deploy`).

## Concepts to land

- **Latency is the product.** Silence on a phone call feels broken after about a second. "One sec, let me check" while a tool runs buys time. Small, fast tool responses matter more than in chat.
- **Voice has its own rules.** No lists, no URLs, one question per turn, prices said like a person says them, never repeat the caller's name (speech-to-text will mangle it).
- **Disclose that it's an AI and that it's recorded.** Often legally required, always good practice.
- **Same evals, different checks.** A voice eval scripts a call and checks tool calls and phrases instead of a single answer.

## Coach notes: poke holes

- The text simulator doesn't have speech-to-text errors, background noise or interruptions. What will a live call surface that `evals:voice` can't?
- `search_docs` returns raw passages and lets the voice model summarize. Would a pre-written short answer be faster to speak?
- The agent can't book appointments. What would it take? (Retell has Cal.com tools. That's also a human-in-the-loop question: does the owner confirm?)

## Challenge

1. Write a voice eval case that fails today. (Ideas: a caller who switches to Spanish, a caller who gives the number in one breath, a caller who asks to talk to a human.)
2. Fix the prompt in `src/voice/prompt.ts` until it passes, without breaking the other voice cases.
3. Optional: put it on Retell and call it.

## Done when

- They've added a voice eval case and made it pass
- They can explain why latency matters more here than in chat
