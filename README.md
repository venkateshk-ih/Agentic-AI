# Agentic AI Tester (Capstone)

[![CI](https://github.com/venkateshk-ih/Agentic-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/venkateshk-ih/Agentic-AI/actions/workflows/ci.yml)

The "Agentic AI Tester" capstone project requires the development of a multi-agent system designed to automate test script generation from documentation.

This repository contains the skeleton for the capstone: a 3-agent system that ingests requirements documentation and produces executable Playwright tests.

Overview
- Agent A (Requirement Extractor): extracts structured, testable requirements from PDFs/markdown.
- Agent B (Code Generator): produces Playwright test files from those requirements, using block-anchored generation for targeted patches.
- Agent C (Quality Assurance): validates generated tests, parses Playwright reports, and requests targeted repairs (up to 5 automated repair iterations).

Getting started (next steps)
1. Install Node.js (>=16) + npm
2. Run `npm install` to install dependencies
3. Run `npm run playwright:install` to install Playwright browsers
4. Run the extractor to create requirements JSON: `npm run extract:agentA`
5. Generate tests: `npm run generate:agentB` or run the pipeline `npx ts-node scripts/run_pipeline.ts` to exercise extract→generate→QA.

Project structure
- `src/agents/` — agents implementation
- `src/generator/` — Playwright code generator and templating
- `src/qa/` — QA checks and repair orchestrator
- `src/services/` — RAG, embedding store, vector DB wrappers (planned)
- `src/infra/` — infra helpers and CI workflows
- `tests/` — unit & integration tests

Notes
- Playwright configuration is in `playwright.config.ts` and tests live in `tests/` and `workspace/generated-tests/`.
- The project uses a block-anchored generation approach (`// BEGIN_REQ: <id>` / `// END_REQ: <id>`) to support targeted repairs.

Next actions
- Add CI workflow (done) to run type-check and Playwright tests on pushes and PRs.
- Add CI for publishing artifacts and further quality gates.
