#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { runQA } from '../src/qa/index';
import { patchGeneratedTest } from '../src/agents/agentB/patcher';

const REQ_FILE = path.join('workspace', 'requirements', 'sample-requirements.requirements.json');
const GENERATED_FILE = path.join('workspace', 'generated-tests', 'sample-requirements_requirements.spec.ts');

async function generate() {
  console.log('Pipeline: Generating tests from requirements');
  spawnSync('npx', ['ts-node', 'src/generator/index.ts', REQ_FILE, path.join('workspace', 'generated-tests')], { stdio: 'inherit' });
}

async function runTests() {
  console.log('Pipeline: Running Playwright tests');
  const res = spawnSync('npx', ['playwright', 'test', 'tests/generated.spec.ts', '--config=playwright.config.ts'], { stdio: 'inherit' });
  return res.status === 0;
}

async function applySuggestionToGenerated(suggestion: string, reqId: string) {
  // Very small heuristic: suggestion format 'Replace getByText("X") with getByRole('button', { name: "X" })'
  // We'll attempt to locate getByText("X") occurrences inside the block and replace with getByRole('button', { name: "X" }).
  console.log('Applying suggestion for', reqId, suggestion);
  // Read generated file
  const text = await fs.readFile(GENERATED_FILE, 'utf8');
  // find quoted value in suggestion
  const m = suggestion.match(/getByText\((?:\"|\')([^\"\']+)(?:\"|\')\)/i);
  if (!m) {
    console.log('No getByText target found in suggestion; skipping automatic patch.');
    return false;
  }
  const target = m[1];
  const oldLineRegex = new RegExp(`getByText\(\\?\"${escapeRegExp(target)}\\?\"\)\.click\(\)`, 'g');
  const newLine = `await page.getByRole('button', { name: ${JSON.stringify(target)} }).click();`;

  // build new block lines by extracting the block and replacing occurrences
  const begin = `// BEGIN_REQ: ${reqId}`;
  const end = `// END_REQ: ${reqId}`;
  const idxBegin = text.indexOf(begin);
  const idxEnd = text.indexOf(end);
  if (idxBegin === -1 || idxEnd === -1) return false;
  const block = text.slice(idxBegin + begin.length, idxEnd);
  const patchedBlock = block.replace(/await page\.getByText\((?:\"|\')([^\"\']+)(?:\"|\')\)\.click\(\);/g, newLine);
  const newBlockLines = patchedBlock.split('\n').map((l) => l.trim()).filter(Boolean);
  await patchGeneratedTest(GENERATED_FILE, reqId, newBlockLines);
  return true;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function pipeline() {
  await generate();

  const maxAttempts = 5;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`Pipeline iteration ${attempt}`);

    // run tests (we run Playwright against tests/generated.spec.ts which we keep in sync)
    const ok = await runTests();
    if (ok) {
      console.log('Pipeline: tests passed');
      return;
    }

    // QA produces suggestions
    const report = await runQA('tests/generated.spec.ts');
    if (report.ok) {
      console.log('QA reported no issues but tests failed — manual inspection needed');
      return;
    }

    // apply first suggestion heuristically
    const issue = report.issues[0];
    console.log('QA issue found:', issue.message);
    if (issue.suggestion) {
      // map to reqId by using issue.file or defaults; here naive mapping: extract first REQ id mentioned
      const reqIdMatch = issue.message.match(/REQ-\d{3}/);
      const reqId = reqIdMatch ? reqIdMatch[0] : 'REQ-002';
      const applied = await applySuggestionToGenerated(issue.suggestion, reqId);
      if (!applied) {
        console.log('Could not apply suggestion automatically:', issue.suggestion);
        return;
      }
      // copy patched generated file into tests/ so Playwright will run it
      await fs.copyFile(GENERATED_FILE, path.join('tests', 'generated.spec.ts'));
      console.log('Patched generated tests and re-running...');
      continue;
    }

    console.log('No actionable suggestion from QA; aborting pipeline.');
    return;
  }

  console.log('Pipeline: reached max attempts');
}

if (require.main === module) {
  pipeline().catch((e) => {
    console.error('Pipeline failed:', e);
    process.exit(1);
  });
}
