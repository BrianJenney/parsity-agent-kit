import "dotenv/config";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";

export type ChunkStrategy = "fixed" | "paragraph" | "sentence" | "markdown";

export const config = {
  collection: process.env.COLLECTION ?? "docs",
  chunkStrategy: (process.env.CHUNK_STRATEGY ?? "paragraph") as ChunkStrategy,
  chunkSize: Number(process.env.CHUNK_SIZE ?? 800),
  chunkOverlap: Number(process.env.CHUNK_OVERLAP ?? 100),
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingDims: 1536, // must match the embedding model. text-embedding-3-large = 3072
  chatModel: process.env.CHAT_MODEL ?? "gpt-4o-mini",
};

// Lazy so `npm run chunks` works without any API keys.
let _openai: OpenAI | null = null;
export function openai() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
    }
    _openai = new OpenAI();
  }
  return _openai;
}

let _qdrant: QdrantClient | null = null;
export function qdrant() {
  if (!_qdrant) {
    _qdrant = new QdrantClient({
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY || undefined,
    });
  }
  return _qdrant;
}

/** Embed many strings in batches. One API call per batch, not per chunk. */
export async function embed(texts: string[], batchSize = 100): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await openai().embeddings.create({ model: config.embeddingModel, input: batch });
    out.push(...res.data.map((d) => d.embedding));
  }
  return out;
}
