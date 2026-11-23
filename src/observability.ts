import { traceable } from "langsmith/traceable";

type RunType = "chain" | "llm" | "tool" | "retriever";

export function traced<Args extends unknown[], R>(name: string, runType: RunType, fn: (...args: Args) => Promise<R>) {
  return traceable(fn, { name, run_type: runType, project_name: process.env.LANGSMITH_PROJECT ?? "parsity-agent-kit" });
}
