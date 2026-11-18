/**
 * Seed a small SQLite DB of (fake) AI job postings.
 *   npm run sql:seed
 */
import Database from "better-sqlite3";

const db = new Database("jobs.db");
db.exec(`
  DROP TABLE IF EXISTS jobs;
  CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    city TEXT NOT NULL,
    remote INTEGER NOT NULL,        -- 0 or 1
    salary_min INTEGER NOT NULL,    -- USD
    salary_max INTEGER NOT NULL,
    skills TEXT NOT NULL,           -- comma separated
    posted_at TEXT NOT NULL         -- ISO date
  );
`);

const titles = ["AI Engineer", "Senior AI Engineer", "Forward Deployed Engineer", "Full Stack Engineer (AI)", "ML Engineer", "Applied AI Lead"];
const companies = ["Northwind Health", "Acme Logistics", "Brightline Labs", "Contoso Finance", "Globex Retail", "Initech", "Umbrella Insurance"];
const cities = ["San Francisco", "New York", "Austin", "Chicago", "Seattle", "Denver"];
const skillSets = [
  "rag,typescript,pinecone,langsmith",
  "python,langgraph,qdrant,evals",
  "agents,tool-calling,postgres,pgvector",
  "voice-ai,twilio,typescript,openai",
  "python,pytorch,mlops,aws",
  "rag,weaviate,python,reranking",
];

const insert = db.prepare(
  "INSERT INTO jobs (title, company, city, remote, salary_min, salary_max, skills, posted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);

// Deterministic "random" so everyone gets the same data.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

for (let i = 0; i < 60; i++) {
  const min = 120_000 + Math.floor(rand() * 10) * 10_000;
  const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
  const month = String(1 + Math.floor(rand() * 10)).padStart(2, "0");
  insert.run(pick(titles), pick(companies), pick(cities), rand() > 0.5 ? 1 : 0, min, min + 40_000 + Math.floor(rand() * 6) * 10_000, pick(skillSets), `2026-${month}-${day}`);
}

console.log("Seeded jobs.db with 60 job postings. Try: npm run sql:ask -- \"average max salary for remote RAG roles by city\"");
