---
name: voice-agent
description: Build or change a phone agent on Retell with a business config, a voice-specific prompt, HTTP tools, post-call analysis and voice evals. Use for receptionists, after-hours support, lead qualification or any phone use case.
---

# Voice agent (Retell)

Reference implementation: `src/voice/` and `VOICE.md`.

## Files and their jobs

- `business.ts`: everything specific to the business (name, hours, service area, scope, out of scope, tone, emergency triggers). New business = new config.
- `prompt.ts`: built from the config. Sections in this order: identity, current time and hours, how you sound, non-negotiable, what you handle, what you don't, emergencies, taking a message, flow (guidance, not a script), always hang up.
- `agent.ts`: tool schemas, Retell tool definitions (custom HTTP tools plus `end_call`), voice settings, `post_call_analysis_data`.
- `handlers.ts`: what tools do. Keep responses small and fast.
- `server.ts`: tool endpoints (shared-secret header) and the `call_analyzed` webhook (verify the Retell signature).
- `conversation.ts` and `chat.ts`: text-mode simulator with the same prompt and tools.
- `deploy.ts`: create or update the LLM and agent by name, optionally bind a phone number.

## Prompt rules that matter

- First sentence: it's an AI assistant and the call is recorded.
- One question per turn, one or two short sentences per turn.
- No lists, markdown, URLs or long numbers. Prices said like a person ("eighty-nine bucks").
- Never repeat the caller's name. Speech-to-text gets names wrong. Read back phone numbers in groups.
- Look things up with a tool instead of answering prices or policies from memory. If the tool finds nothing, offer a callback.
- Spam or abuse: say bye, `end_call`.
- Always call `end_call` after saying bye.

## Latency

- `speak_during_execution` with a short line ("One sec, let me check") on every tool.
- Return a few short passages, not whole documents.
- Log tool latency. Over a second of silence feels broken.

## Settings worth knowing

`responsiveness`, `interruption_sensitivity`, `enable_backchannel`, `denoising_mode`,
`end_call_after_silence_ms`, `max_call_duration_ms`.

## Evals

Add scripted calls to `voiceCases` in `src/evals/cases.ts`: caller turns plus expectations (tools
called or not, emergency flagged, phrases included or never said, call ended). Run `npm run evals:voice`
after every prompt change. Text mode doesn't cover speech errors or noise, so also review real call
transcripts and turn bad ones into cases.

## Compliance basics

Disclose AI and recording. Outbound AI calls need prior consent, an opt-out and calling-hour limits.
Don't collect card numbers, government ids or health details on a general-purpose agent.
