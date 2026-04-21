#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { runQA } from '../src/qa/index';

const REQ_SRC = path.join('tests', 'data', 'sample-requirements.md');
const REQ_FILE = path.join('workspace', 'requirements', 'sample-requirements.requirements.json');
const GENERATED_DIR = path.join('workspace', 'generated-tests');
const GENERATED_FILE = path.join(GENERATED_DIR, 'sample-requirements_requirements.spec.ts');

async function run() {
  console.log('Integration demo: Extract -> Generate -> QA');

  console.log('1) Running extractor (Agent A) on sample requirements');
  const e1 = spawnSync('npx', ['ts-node', 'src/agents/agentA/runner.ts', REQ_SRC], { stdio: 'inherit' });
  if (e1.status !== 0) {
    console.error('Extractor failed');
    process.exit(1);
  }

  console.log('2) Running generator (Agent B)');
  const e2 = spawnSync('npx', ['ts-node', 'src/generator/index.ts', REQ_FILE, GENERATED_DIR], { stdio: 'inherit' });
  if (e2.status !== 0) {
    console.error('Generator failed');
    process.exit(1);
  }

  console.log('3) Copy generated test into `tests/` for Playwright to run');
  await fs.copyFile(GENERATED_FILE, path.join('tests', 'generated.spec.ts'));

  console.log('4) Run Playwright test for the generated spec (single file)');
  const t = spawnSync('npx', ['playwright', 'test', 'tests/generated.spec.ts', '--config=playwright.config.ts'], { stdio: 'inherit' });
  const ok = t.status === 0;

  console.log('5) Run QA (Agent C) against the generated test');
  const report = await runQA('tests/generated.spec.ts');
  console.log('QA Report:', JSON.stringify(report, null, 2));

  if (!ok) {
    console.log('Demo: tests failed — QA report above contains suggestions for repair.');
  } else {
    console.log('Demo: tests passed. Integration demo successful.');
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error('Integration demo failed:', e);
    process.exit(1);
  });
}
