import { readFileSync } from "node:fs";
import { z } from "zod";
import { structured } from "./llm.js";

const SupplierIntakeForm = z.object({
  companyName: z.string(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  country: z.string().nullable(),
  categories: z.array(z.string()).describe("What they sell, e.g. 'packaging', 'industrial adhesives'"),
  certifications: z.array(z.string()).describe("ISO 9001, ISO 14001, etc."),
  annualRevenueUsd: z.number().nullable(),
  minimumOrderQuantity: z.string().nullable(),
  missingFields: z.array(z.string()).describe("Required fields you could NOT find. Never invent values."),
});

const sample = `Hey there,
Following up from the trade show. We're Brightline Packaging out of Monterrey, Mexico.
We do corrugated boxes and custom molded pulp inserts, mostly for consumer electronics.
We're ISO 9001 certified and finishing up 14001 this spring. MOQ is usually 5k units.
Reach me directly at dana@brightline-pack.example — Dana Ruiz, Sales Director.`;

const input = process.argv[2] ? readFileSync(process.argv[2], "utf8") : sample;

const form = await structured({
  schema: SupplierIntakeForm,
  name: "supplier_intake",
  system: "Extract the supplier intake form from the text. Use null for anything not stated. Never guess.",
  user: input,
});

console.log(JSON.stringify(form, null, 2));
if (form.missingFields.length) {
  console.log(`\n>> Missing: ${form.missingFields.join(", ")}. Ask the human instead of guessing.`);
}
