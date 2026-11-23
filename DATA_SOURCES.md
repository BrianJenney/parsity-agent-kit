# Where to Get Data

The more annoying the data is to get, the more valuable your project becomes.
Easy datasets are fine for learning the pipeline. Hard-to-get data is what makes people care.

## Easy mode (clean, downloadable)

- **Hugging Face Datasets**: https://huggingface.co/datasets. Thousands of text datasets; filter by task and size.
- **arXiv**: https://arxiv.org (bulk access: https://info.arxiv.org/help/bulk_data.html). Research papers with clean metadata.
- **Kaggle**: https://www.kaggle.com/datasets. Lots of CSVs, which work well for the SQL path.
- **Project Gutenberg**: https://www.gutenberg.org. Public-domain books, good for chunking experiments.
- **data.gov**: https://data.gov. U.S. government datasets.

## Hard mode (scrape it yourself, more interesting)

- **Firecrawl**: https://firecrawl.dev. Turns any website into clean markdown, including crawling a whole site.
- **Crawl4AI**: https://github.com/unclecode/crawl4ai. Open-source, LLM-friendly crawler you run yourself.
- **Municipal codes**: most U.S. cities publish theirs online (search "<your city> municipal code").
- **YouTube transcripts**: use a transcript API or library for a creator's channel.
- **Company websites**: Google Maps / directory listings, then Firecrawl each site.
- **SEC EDGAR**: https://www.sec.gov/edgar. 10-Ks and earnings filings; dense, long, and full of tables.
- **Public meeting agendas and minutes**: city councils, school boards, planning commissions.

## Inside your company (best mode)

Support tickets, internal wikis, sales call notes, onboarding docs, product specs, the
shared inbox nobody wants to read. Ask permission, strip PII, and start small.

> Heads up: scraped content can contain prompt injection ("ignore previous instructions...").
> Treat retrieved text as data, never as instructions. `src/rag.ts` does this in its system prompt.
