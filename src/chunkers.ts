/**
 * CHUNKING STRATEGIES
 *
 * This file is where you'll spend most of your time. Retrieval quality is decided
 * here, long before the LLM sees anything. Bad chunks in = bad answers out.
 *
 * Switch strategies with CHUNK_STRATEGY in .env, run `npm run chunks -- <file>`
 * to eyeball the result, and only THEN pay to embed it.
 */
import type { ChunkStrategy } from "./config.js";

export interface Chunk {
  text: string;
  index: number;
  /** The nearest markdown heading above this chunk, if any. Great metadata. */
  heading?: string;
}

export interface ChunkOptions {
  size: number; // max characters per chunk
  overlap: number; // characters repeated between neighbors (fixed strategy)
}

/** 1. FIXED: slice every N characters with overlap. Dumb, fast, splits mid-sentence. */
export function fixedChunks(text: string, { size, overlap }: ChunkOptions): Chunk[] {
  if (overlap >= size) throw new Error("CHUNK_OVERLAP must be smaller than CHUNK_SIZE");
  const chunks: Chunk[] = [];
  for (let start = 0, i = 0; start < text.length; start += size - overlap, i++) {
    chunks.push({ text: text.slice(start, start + size).trim(), index: i });
  }
  return chunks.filter((c) => c.text.length > 0);
}

/**
 * Greedy packer used by the smarter strategies: keep adding pieces (paragraphs,
 * sentences) to a chunk until the next one would blow past `size`.
 */
function pack(pieces: string[], size: number, joiner: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const p = piece.trim();
    if (!p) continue;
    if (current && current.length + joiner.length + p.length > size) {
      out.push(current);
      current = p;
    } else {
      current = current ? current + joiner + p : p;
    }
  }
  if (current) out.push(current);
  return out;
}

/** 2. PARAGRAPH: split on blank lines, then pack paragraphs up to `size`. Good default. */
export function paragraphChunks(text: string, { size }: ChunkOptions): Chunk[] {
  return pack(text.split(/\n\s*\n/), size, "\n\n").map((t, index) => ({ text: t, index }));
}

/** 3. SENTENCE: split on sentence boundaries, pack up to `size`. Good for dense prose/transcripts. */
export function sentenceChunks(text: string, { size }: ChunkOptions): Chunk[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
  return pack(sentences, size, " ").map((t, index) => ({ text: t, index }));
}

/**
 * 4. MARKDOWN: split by headings so each chunk belongs to ONE section, and keep the
 * heading as metadata. Best for docs, legal codes, policies, READMEs.
 * Oversized sections fall back to paragraph packing.
 */
export function markdownChunks(text: string, opts: ChunkOptions): Chunk[] {
  const sections: { heading?: string; body: string }[] = [];
  let heading: string | undefined;
  let buf: string[] = [];
  const flush = () => {
    if (buf.join("").trim()) sections.push({ heading, body: buf.join("\n") });
    buf = [];
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.*)/);
    if (m) {
      flush();
      heading = m[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  const chunks: Chunk[] = [];
  for (const s of sections) {
    for (const t of pack(s.body.split(/\n\s*\n/), opts.size, "\n\n")) {
      // Prepending the heading to the text helps the embedding "know" the context.
      chunks.push({ text: s.heading ? `${s.heading}\n\n${t}` : t, heading: s.heading, index: chunks.length });
    }
  }
  return chunks;
}

export function chunk(text: string, strategy: ChunkStrategy, opts: ChunkOptions): Chunk[] {
  switch (strategy) {
    case "fixed":
      return fixedChunks(text, opts);
    case "paragraph":
      return paragraphChunks(text, opts);
    case "sentence":
      return sentenceChunks(text, opts);
    case "markdown":
      return markdownChunks(text, opts);
    default:
      throw new Error(`Unknown CHUNK_STRATEGY "${strategy}". Use fixed | paragraph | sentence | markdown`);
  }
}

/*
 * EXERCISES (do these, this is where the learning is):
 *  - Ingest data/samples/municipal-code.md with `fixed` then `markdown`. Ask
 *    "how late can I run a leaf blower on Sunday?" Which one answers correctly? Why?
 *  - Add a `semantic` strategy: embed each sentence, start a new chunk when cosine
 *    similarity between neighbors drops below a threshold.
 *  - Add a `parent-child` strategy: embed small chunks, but return the bigger parent
 *    section to the LLM. (Small chunks retrieve well; big chunks answer well.)
 */
