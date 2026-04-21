# Agentic AI Tester — Project Overview

This document summarizes the current state of the "Agentic AI Tester" capstone project: architecture, agents, files, how to run the main flows, current status, limitations, and recommended next steps.

## Project at-a-glance
- Name: Agentic AI Tester (capstone)
- Goal: Multi-agent system that extracts testable requirements from documentation (PDF/Markdown), generates Playwright tests, runs those tests, and performs QA-driven targeted repairs (≤5 iterations). RAG (EmbeddingGemma) is planned but not yet integrated.
- Language / tools: TypeScript + Node.js, Playwright for browser testing, ts-node for scripts, `pdf-parse` for PDF parsing.

## High-level architecture & agents

- Agent A — Requirement Extractor
  - Reads Markdown or PDF, parses headings/bullets into structured requirement JSON.
  - Normalizes step targets into a `targetLocator` model with `type`/`value` and `suggested` Playwright call templates.
  - Files:
    - `src/agents/agentA/parser.ts`
    - `src/agents/agentA/index.ts`
    - `src/agents/agentA/runner.ts`
  - Sample input: `tests/data/sample-requirements.md`
  - Extraction outputs: `workspace/requirements/*.requirements.json`

- Agent B — Code Generator
  - Consumes requirement JSON and emits Playwright TypeScript test files.
  - Uses block anchors around each requirement: `// BEGIN_REQ: <ID>` / `// END_REQ: <ID>` to enable targeted patches.
  - Generator heuristics prefer `getByLabel` for inputs and `getByRole('button', { name })` for clicks when possible.
  - Files:
    - `src/generator/index.ts`
  - Generated tests: `workspace/generated-tests/` (and copied to `tests/generated.spec.ts` for execution)

- Agent C — Quality Assurance
  - Runs Playwright and parses Playwright markdown report artifacts to synthesize `QAReport` with issues and actionable suggestions.
  - Detection heuristics implemented for:
    - strict-mode locator ambiguity (getByText)
    - timeouts waiting for selector
    - assertion failures (toBeVisible/toHaveText/toHaveURL)
    - navigation/goto failures
  - Files:
    - `src/qa/index.ts`

- Patcher
  - Applies targeted edits to the block anchored to a given requirement (text-level patcher).
  - File: `src/agents/agentB/patcher.ts`

- Orchestration scripts
  - Full pipeline (generate → run tests → QA → patch → re-run up to 5 iterations): `scripts/run_pipeline.ts`
  - Integration demo (single extract→generate→QA): `scripts/run_integration_demo.ts`
  - Developer helper: `scripts/run_manual_test.ts`

## Key files and paths
- Source: `src/`
  - `src/agents/agentA/*` — extractor/parser
  - `src/generator/index.ts` — generator
  - `src/qa/index.ts` — QA parser/runner
  - `src/agents/agentB/patcher.ts` — patcher
  - `src/schema/req-schema.json` — requirement JSON schema
- Tests & artifacts:
  - `tests/` — contains sample inputs and generated spec used by Playwright
  - `workspace/requirements/` — extracted requirement JSON
  - `workspace/generated-tests/` — generator output
  - `playwright-report/` — Playwright report artifacts used by QA
- CI:
  - `.github/workflows/ci.yml` — runs `npm ci`, `npm run build`, Playwright browsers install and Playwright tests
  - README includes CI badge

## Implemented features / current status
- Implemented:
  - Project scaffold, TypeScript + Playwright setup.
  - Agent A parser (Markdown + `pdf-parse` stub).
  - `targetLocator` normalization and suggested Playwright locators.
  - Agent B generator that emits block-anchored Playwright tests.
  - Agent C QA heuristics for common Playwright failure modes.
  - Patcher to apply targeted block-level edits.
  - `scripts/run_pipeline.ts` (repair loop prototype) and `scripts/run_integration_demo.ts` (demo).
  - Git repo initialized and pushed to GitHub; CI workflow added and README updated.
- Not implemented / pending:
  - RAG integration (EmbeddingGemma).
  - AST-aware safe patching (current patcher is text-based).
  - Exhaustive QA mapping for many failure classes.
  - More advanced generator locator heuristics and wider test coverage.
  - Unit tests for QA parser detection branches.

## How to run locally
1. Install dependencies
```bash
npm install
```
2. Install Playwright browsers (first run)
```bash
npm run playwright:install
```
3. Run the integration demo (extract → generate → run test → QA)
```bash
npm run demo:integration
```
4. Or run the full pipeline
```bash
npx ts-node scripts/run_pipeline.ts
```
5. Run Playwright tests directly
```bash
npm run test:playwright
# or
npx playwright test --config=playwright.config.ts
```
6. Run extractor or generator individually
```bash
npm run extract:agentA
npm run generate:agentB
```

## Outputs & artifacts
- Extracted requirements JSON: `workspace/requirements/*.requirements.json`
- Generator output: `workspace/generated-tests/*.spec.ts`
- Copied test for Playwright: `tests/generated.spec.ts`
- Playwright report: `playwright-report/` (contains markdown artifacts parsed by QA)
- QA output: printed to console and returned by `src/qa/index.ts` when invoked

## Contract / success criteria (integration demo)
- Inputs: requirement Markdown or PDF file (e.g., `tests/data/sample-requirements.md`).
- Outputs: Playwright test file(s) that execute against the target application, plus a QA report with detected issues and suggestions.
- Error modes:
  - No requirements extracted → no tests generated (script logs this).
  - Playwright failures → QA returns structured suggestion(s).
  - Patch apply failures → logged and pipeline aborts (manual intervention needed).
- Success: demo runs end-to-end and Playwright tests pass, or QA provides actionable suggestions and patched tests improve pass rate within ≤5 repair iterations.

## Known edge cases & limitations
- Patcher is text-based — brittle if formatting or context changes; AST-based edits would be more robust.
- QA suggestions are heuristic — may not cover all failure modes or produce safe patches.
- No RAG / EmbeddingGemma integration; generator lacks retrieval context for complex UIs.
- Generator may still produce ambiguous `getByText` locators in some cases; QA handles a subset of these.
- Playwright artifacts are not currently uploaded in CI — enabling artifact uploads would help debugging.

## Recommended next steps (prioritized)
1. Implement automatic patch-apply in the integration demo: apply QA suggestions and re-run tests up to 5 attempts (add safe backups & validation).
2. Add unit tests for `src/qa/index.ts` to validate detection branches against representative Playwright markdown samples.
3. Improve the patcher to be AST-aware (use TypeScript parser/printer to edit only the code inside the block).
4. Integrate a lightweight RAG (EmbeddingGemma) to provide the generator with richer context for locator inference.
5. Improve CI:
   - Upload Playwright artifacts (traces/screenshots/report) on failure.
   - Add lint/format steps and optionally test matrix.
6. Add more generator heuristics and more sample requirement documents.

## Git & CI checks
- Verify remote and commits:
```bash
git remote -v
git log --oneline -n 5
```
- Confirm CI workflow presence:
```bash
ls .github/workflows
sed -n '1,160p' .github/workflows/ci.yml
```

---

Generated by the project maintainer tools — saved to `docs/PROJECT_OVERVIEW.md`.
