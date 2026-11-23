import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { config, openai } from "./config.js";

type StructuredCall<T extends z.ZodTypeAny> = {
  schema: T;
  name: string;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
};

export async function structured<T extends z.ZodTypeAny>({
  schema,
  name,
  system,
  user,
  model = config.chatModel,
  temperature = 0,
}: StructuredCall<T>): Promise<z.infer<T>> {
  const response = await openai().responses.parse({
    model,
    temperature,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: zodTextFormat(schema, name) },
  });
  return schema.parse(response.output_parsed);
}

export async function text({ system, user, model = config.chatModel }: { system: string; user: string; model?: string }) {
  const response = await openai().responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.output_text;
}
