import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";

export interface Doc {
  source: string;
  text: string;
}

export function loadDocs(path: string): Doc[] {
  const stat = statSync(path);
  const files = stat.isDirectory()
    ? readdirSync(path)
        .filter((f) => [".txt", ".md"].includes(extname(f)))
        .map((f) => join(path, f))
    : [path];
  return files.map((f) => ({ source: basename(f), text: readFileSync(f, "utf8") }));
}
