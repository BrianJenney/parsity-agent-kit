# Challenge: Chunk the Bible

Nothing religious about this one. The King James Bible is big (about 31,000 verses), free, public
domain, and heavily structured: books, chapters, verses. That makes it a great chunking corpus.
Semantic Bible search apps are a real product category. Somebody types "what does it say about
worry?" and gets back the 10 passages that matter. That's what you're building.

This is the same chunking assignment from the Parsity AI engineering program.

## Why this is the assignment

The tutorial version of RAG is "split the text into 1,200 character chunks, embed, done." That
sounds reasonable until you look at what it produces: verses cut in half, chunks that start in the
middle of a word, a chunk that's the end of Genesis glued to the start of Exodus, and nothing that
tells you where a chunk came from. Your vector store becomes a huge freaking mess, and retrieval
can't be better than the chunks you feed it.

**The code is the easy half. The reasoning is the assignment.**

## Get the text

```bash
npm run bible:fetch
```

Downloads the KJV from Project Gutenberg (about 4 MB) into `data/bible/kjv.txt`. That folder is
gitignored.

## Step 1: See the wrong way

```bash
npm run bible:fixed
npm run bible:audit -- data/bible/chunks-fixed.jsonl
```

`bible:fixed` slices the raw text into 500-character windows and ignores structure completely.
Read the chunks it prints. Then look at the audit: how many start mid-word, how many end
mid-sentence, how many have metadata (zero). Try `--size 800 --overlap 100` and see what changes
and what doesn't.

## Step 2: Write your own chunker

Open `src/bible/chunk-smart.ts` and write `buildChunks()`. You get every verse from
`loadVerses()` as `{ book, chapter, verse, text }`. You return chunks shaped like `BibleChunk`.

The rules:

- **Never split a verse.** A verse is the smallest unit that means anything here.
- **Never let a chunk cross a book.** Genesis and Exodus don't belong in the same chunk.
- **Every chunk gets metadata**, at minimum a reference a human can read, like `"Genesis 1:1-5"`.
- **The strategy is your call.** One verse per chunk? A whole chapter? Verses packed up to a target size? Overlap between chunks? All are defensible. Pick one and have a reason.

Two flags are already wired up for you: `--target` (target size in characters, default 800) and
`--overlap-verses` (how many verses to repeat at the start of the next chunk, default 0).

```bash
npm run bible:smart -- --target 800 --overlap-verses 1
npm run bible:audit -- data/bible/chunks-smart.jsonl
```

Beat the fixed-size numbers. Then ask yourself whether you'd be able to answer a question from any
single chunk you produced.

Things to think about:

- **Too small:** one verse per chunk gives perfect references, but "Jesus wept." doesn't carry much meaning alone, and you'll store 31,000 vectors.
- **Too big:** a whole chapter (Psalm 119 is 176 verses) dilutes the embedding. It's about everything, so it matches nothing well.
- **Overlap:** repeating a verse or two between chunks keeps a thought from getting cut off at the boundary. It costs more storage and can return near-duplicate results. When is that worth it?
- **Book names:** the parser gives you Gutenberg's full titles, like "The First Book of Moses: Called Genesis". Nobody searches for that. Cleaning them up to "Genesis" is a good stretch goal.

## Step 3: Store it

```bash
npm run bible:ingest -- data/bible/chunks-smart.jsonl --limit 200 --reset
```

That embeds the first 200 chunks into a separate Qdrant collection called `bible-kjv`, so it won't
mix with your other docs. Check the dashboard at http://localhost:6333/dashboard and make sure the
metadata looks right. When it does, drop `--limit`. The whole Bible is roughly a million tokens,
about $0.02 with `text-embedding-3-small`. The script prints the estimate before it starts.

Every chunk gets your metadata plus `strategy` (taken from the file name), so you can store two
strategies side by side and compare them:

```bash
npm run bible:ingest -- data/bible/chunks-fixed.jsonl
```

## Step 4: Search it

The kit's query script works on any collection:

```bash
COLLECTION=bible-kjv npm run query -- "verses about not worrying" --rerank
COLLECTION=bible-kjv npm run query -- "the creation of light"
COLLECTION=bible-kjv npm run query -- "what happens to the Egyptian army at the sea"
```

Look at the references it cites. If retrieval sucks, it's almost always the chunks. Go back to step 2.

## Check yourself

If you can explain these out loud in two or three minutes, you got it. That's also roughly how
it'll come up in an AI engineering interview.

1. What chunking is, in your own words.
2. The strategy you picked and why you picked it over the others.
3. What overlap is and when you'd use it.

## Further reading

- [Pinecone: Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/)
- [Greg Kamradt: 5 Levels of Text Splitting](https://github.com/FullStackRetrieval-com/RetrievalTutorials/blob/main/tutorials/LevelsOfTextSplitting/5_Levels_Of_Text_Splitting.ipynb)
- [LlamaIndex: Evaluating the Ideal Chunk Size](https://www.llamaindex.ai/blog/evaluating-the-ideal-chunk-size-for-a-rag-system-using-llamaindex-6207e5d3fec5)
- [OpenAI: Embeddings guide](https://platform.openai.com/docs/guides/embeddings)
