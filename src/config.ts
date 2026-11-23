import "dotenv/config";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { wrapOpenAI } from "langsmith/wrappers";

export type ChunkStrategy = "fixed" | "paragraph" | "sentence" | "markdown";

export const config = {
  collection: process.env.COLLECTION ?? "docs",
  chunkStrategy: (process.env.CHUNK_STRATEGY ?? "paragraph") as ChunkStrategy,
  chunkSize: Number(process.env.CHUNK_SIZE ?? 800),
  chunkOverlap: Number(process.env.CHUNK_OVERLAP ?? 100),
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingDims: Number(process.env.EMBEDDING_DIMS ?? 1536),
  chatModel: process.env.CHAT_MODEL ?? "gpt-4o-mini",
  routerModel: process.env.ROUTER_MODEL ?? process.env.CHAT_MODEL ?? "gpt-4o-mini",
  judgeModel: process.env.JUDGE_MODEL ?? "gpt-4o",
};

export const tracingEnabled = process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY);

let openaiClient: OpenAI | null = null;
export function openai() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.");
    }
    const client = new OpenAI();
    openaiClient = tracingEnabled ? wrapOpenAI(client) : client;
  }
  return openaiClient;
}

let qdrantClient: QdrantClient | null = null;
export function qdrant() {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY || undefined,
    });
  }
  return qdrantClient;
}

export async function embed(texts: string[], batchSize = 100): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const res = await openai().embeddings.create({ model: config.embeddingModel, input: texts.slice(i, i + batchSize) });
    vectors.push(...res.data.map((d) => d.embedding));
  }
  return vectors;
}
