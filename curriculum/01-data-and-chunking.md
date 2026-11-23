# 01: Data and chunking

## Why this matters

Retrieval can't be better than the chunks you feed it. The tutorial version of RAG is "split the
text into 1,200 character chunks, embed, done." That sounds reasonable until you see verses cut in
half, chunks that start mid-word, two unrelated documents glued together, and nothing telling you
where a chunk came from. You'll spend more time on data and chunking than on prompts. That's normal.

## Part 1: Where does the data come from?

Before anyone chunks anything, someone has to get the data.

- **Easy mode:** download a clean dataset (Hugging Face, Kaggle, Project Gutenberg). See `DATA_SOURCES.md`.
- **Hard mode:** scrape it. Firecrawl or Crawl4AI turn a website into markdown. Sending raw HTML to an LLM and asking for structured output also works and beats hand-written parsers more often than you'd think.
- **Best mode:** data from their job. Ask permission, strip PII, start small.

Ask them: what's in the data they wrote down in module 00? Is it already structured (rows and
columns), semi-structured (markdown with headings, JSON), or a wall of text?

## Part 2: Do you even need to chunk?

Not always. Ask them to argue each of these before you give your take:

- **A short FAQ (2 pages):** you could put the whole thing in the prompt. Context windows are huge now. Why chunk at all? (Cost per call, latency, and models getting worse at finding things in the middle of long context.)
- **A product catalog in a database:** it's already split into rows. Each row might already be a chunk, or you might not need vectors at all (module 02).
- **Support tickets:** each ticket is a natural unit. Splitting one in half loses the question or the answer.
- **A 300-page policy manual:** now you need to chunk, and the headings are doing a lot of the work for you.

## Part 3: Poke holes in the repo's chunkers

Have them run:

```bash
npm run chunks -- data/samples/municipal-code.md
CHUNK_STRATEGY=fixed CHUNK_SIZE=300 npm run chunks -- data/samples/municipal-code.md
CHUNK_STRATEGY=markdown npm run chunks -- data/samples/municipal-code.md
```

Then open `src/chunkers.ts` together. There are four strategies: fixed, paragraph, sentence and
markdown-by-heading. Ask them to find problems. Good ones to steer toward:

- **`fixedChunks` splits mid-word and mid-sentence.** Overlap softens that but doesn't fix it.
- **`sentenceChunks` splits on a regex.** What happens with "Dr. Smith" or "8:00 a.m."?
- **`markdownChunks` prepends the heading to the chunk text.** Why would that help the embedding? What does it cost?
- **`paragraphChunks` ignores `overlap`.** Should it?
- **Only `fixed` uses overlap at all.** When would you want overlap with the others?
- **Nothing tracks a parent section.** If a chunk matches, you might want to send the whole section to the LLM, not just the chunk (small chunks retrieve well, big chunks answer well).

## Concepts to land

Ask them to explain each in their own words before you add anything.

- **Chunk size:** too big and the embedding is "about everything," so it matches nothing well. Too small and a chunk can't stand on its own.
- **Overlap:** repeating the end of one chunk at the start of the next so an idea that crosses a boundary isn't lost. Costs storage and can return near-duplicates.
- **Structure-aware chunking:** split on the document's natural boundaries (sections, paragraphs, verses, tickets) instead of character counts.
- **Metadata:** source, section, date, author, customer ID stored next to the vector. It's how you filter, cite and debug. Most bad RAG apps skimp here.

## Challenge: chunk the Bible

Nothing religious about this one. The King James Bible is about 31,000 verses, public domain, and
heavily structured (books, chapters, verses), so it's a great chunking corpus. Semantic search
over scripture is a product people build: "what does it say about worry?" returns the 10 passages
that matter.

**Step 1: see the wrong way.**

```bash
npm run bible:fetch
npm run bible:fixed
npm run bible:audit -- data/bible/chunks-fixed.jsonl
```

Read the chunks it prints. Look at the audit: how many start mid-word, how many end mid-sentence,
how many have metadata (zero). Try `npm run bible:fixed -- --size 800 --overlap 100`. What
changes? What doesn't?

**Step 2: decide on an approach.** Don't write code yet. Ask questions until they've committed to a
strategy and can say why:

- What's the smallest unit that means anything here? (A verse.)
- One verse per chunk: what's good about it? ("Jesus wept." is a whole verse. Does that embed into anything useful? And that's 31,000 vectors.)
- A whole chapter: what's bad about it? (Psalm 119 is 176 verses. That embedding is about everything.)
- Packed passages up to a target size: what size, and why?
- Overlap: how many verses, if any? When would a user's question land right on a boundary?
- What metadata does a user need to see in the answer? ("Genesis 1:1-5", not chunk #4012.)
- What should never happen? (Splitting a verse. A chunk that crosses from one book into the next.)

**Step 3: build it.** Open `src/bible/chunk-smart.ts` and write `buildChunks()`. It gets every
verse from `loadVerses()` as `{ book, chapter, verse, text }` and returns `BibleChunk`s. The flags
`--target` (characters, default 800) and `--overlap-verses` (default 0) are already wired up.
Pair on it once they have an approach.

```bash
npm run bible:smart -- --target 800 --overlap-verses 1
npm run bible:audit -- data/bible/chunks-smart.jsonl
```

Beat the fixed-size numbers. Stretch goal: the parser gives Gutenberg's full titles ("The First Book
of Moses: Called Genesis"). Nobody searches for that. Clean them up to "Genesis."

**Step 4: store and search it.**

```bash
npm run bible:ingest -- data/bible/chunks-smart.jsonl --limit 200 --reset
```

That puts 200 chunks in a separate `bible-kjv` collection. Check the metadata in the Qdrant
dashboard, then drop `--limit` (about a million tokens, roughly $0.02). Ingest the fixed chunks
too so you can compare them side by side (`strategy` is stored on every point):

```bash
npm run bible:ingest -- data/bible/chunks-fixed.jsonl
COLLECTION=bible-kjv npm run query -- "verses about not worrying" --rerank
COLLECTION=bible-kjv npm run query -- "what happens to the Egyptian army at the sea"
```

If retrieval is bad, it's almost always the chunks. Go back to step 2.

## Check yourself

They should be able to say each of these out loud in a sentence or two:

1. What chunking is.
2. The strategy they picked for the Bible and why it beat the alternatives.
3. What overlap is and when they'd use it.
4. A case where they wouldn't chunk at all.

## Done when

- `chunks-smart.jsonl` beats `chunks-fixed.jsonl` on every audit line
- Every chunk has a readable reference
- They've searched both collections and can explain the difference in results
- `.learning/progress.md` records the strategy they picked and why
