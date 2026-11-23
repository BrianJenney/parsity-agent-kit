import type { ChunkStrategy } from "./config.js";

export interface Chunk {
  text: string;
  index: number;
    heading?: string;
}

export interface ChunkOptions {
  size: number;
  overlap: number;
}

export function fixedChunks(text: string, { size, overlap }: ChunkOptions): Chunk[] {
  if (overlap >= size) throw new Error("CHUNK_OVERLAP must be smaller than CHUNK_SIZE");
  const chunks: Chunk[] = [];
  for (let start = 0, i = 0; start < text.length; start += size - overlap, i++) {
    chunks.push({ text: text.slice(start, start + size).trim(), index: i });
  }
  return chunks.filter((c) => c.text.length > 0);
}

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

export function paragraphChunks(text: string, { size }: ChunkOptions): Chunk[] {
  return pack(text.split(/\n\s*\n/), size, "\n\n").map((t, index) => ({ text: t, index }));
}

export function sentenceChunks(text: string, { size }: ChunkOptions): Chunk[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
  return pack(sentences, size, " ").map((t, index) => ({ text: t, index }));
}

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
