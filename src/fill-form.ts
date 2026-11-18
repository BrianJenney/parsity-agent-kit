/**
 * FILL A FORM with structured outputs.
 *
 *   npm run fill-form
 *   npm run fill-form -- path/to/messy-email.txt
 *
 * This is the most underrated AI use case inside companies. Somewhere in your org,
 * a human is reading emails/PDFs/call notes and retyping them into a form. The
 * schema below IS the form. The model can only return data in that shape, so you
 * can validate it, save it to a DB, or POST it to an API.
 *
 * Production version: missing fields -> ask the user (human in the loop) instead of guessing.
 */
import { readFileSync } from "node:fs";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { config, openai } from "./config.js";

// The "form". Change this to whatever your company actually fills out.
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

const completion = await openai().beta.chat.completions.parse({
  model: config.chatModel,
  temperature: 0,
  response_format: zodResponseFormat(SupplierIntakeForm, "supplier_intake"),
  messages: [
    { role: "system", content: "Extract the supplier intake form from the text. Use null for anything not stated. Never guess." },
    { role: "user", content: input },
  ],
});

const form = completion.choices[0].message.parsed;
console.log(JSON.stringify(form, null, 2));
if (form?.missingFields.length) {
  console.log(`\n>> Missing: ${form.missingFields.join(", ")}. Ask the human instead of guessing.`);
}
