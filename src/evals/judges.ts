import { z } from "zod";
import { config } from "../config.js";
import { structured } from "../llm.js";

export type JudgeVerdict = { judge: string; metric: string; score: number; pass: boolean; reasoning: string };

export const PASS_SCORE = 7;

const JudgeSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string().describe("One or two sentences"),
});

const FAITHFULNESS_RUBRIC = `You grade whether an answer is grounded in the retrieved data.
10: every claim is supported by the retrieved data, or it correctly says the data doesn't answer the question.
7-9: grounded, with minor harmless wording beyond the data.
4-6: some claims aren't supported.
0-3: invents facts, numbers or policies, or contradicts the data.
If nothing was retrieved and the question is general knowledge, a correct short answer scores 10.`;

export async function llmFaithfulness(question: string, retrieved: string, answer: string): Promise<JudgeVerdict> {
  const { score, reasoning } = await structured({
    schema: JudgeSchema,
    name: "faithfulness",
    model: config.judgeModel,
    system: FAITHFULNESS_RUBRIC,
    user: `<question>${question}</question>\n<retrieved-data>\n${retrieved || "(nothing)"}\n</retrieved-data>\n<answer>${answer}</answer>`,
  });
  return { judge: "llm", metric: "faithfulness", score, pass: score >= PASS_SCORE, reasoning };
}

export async function jevFaithfulness(question: string, retrieved: string, answer: string): Promise<JudgeVerdict> {
  const { TypeSafeClient, noul, score } = await import("@typesafe-ai/sdk");
  const client = new TypeSafeClient();
  const { answers } = await client.systemOne({
    state: { question, retrieved: retrieved || "(nothing)", answer },
    questions: {
      grounded: noul("Is every factual claim in the answer supported by the retrieved data?"),
      quality: score("How well does the answer address the question using only the retrieved data?", [
        "ignores the question or invents facts",
        "partly answers, some unsupported claims",
        "answers correctly and stays grounded",
      ]),
    },
  });
  const scaled = Math.round((answers.quality.score / 2) * 10 * 10) / 10;
  const pass = answers.grounded.noul >= 0.7 && scaled >= PASS_SCORE;
  return {
    judge: "jev",
    metric: "faithfulness",
    score: scaled,
    pass,
    reasoning: `P(grounded)=${answers.grounded.noul.toFixed(2)}, quality=${answers.quality.score.toFixed(2)}/2 (confidence ${answers.quality.confidence.toFixed(2)})`,
  };
}
