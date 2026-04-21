Agent A - Requirement Extractor

This module provides a minimal extractor that converts Markdown (and optionally PDF) requirements into a structured requirement JSON format consumed by Agent B.

Current features:
- Parse a Markdown file where top-level headings (#) denote requirement titles and bullet lists under headings denote steps.
- Outputs an array of Requirement objects: { id, title, description, sourceUrl?, steps: [{ action, targetHint, expected }] }


Notes:
- PDF extraction: this module can parse PDFs when `pdf-parse` is installed. Install it with:

	```bash
	npm install pdf-parse
	```

	The parser uses a simple heuristic to convert extracted text into pseudo-markdown and then applies the same heading/bullet heuristics as Markdown parsing. PDFs often lack explicit structure, so results may require manual review.

	CLI runner
	----------

	You can run a small CLI that extracts requirements from a Markdown or PDF file and writes a JSON file to `workspace/requirements/`.

	Example:

	```bash
	# extract a markdown file
	npm run extract:agentA -- tests/data/sample-requirements.md

	# extract a pdf file (after installing pdf-parse)
	npm run extract:agentA -- tests/data/sample.pdf
	```

	The runner writes files like `workspace/requirements/sample-requirements.json` containing an array of extracted requirement objects.
