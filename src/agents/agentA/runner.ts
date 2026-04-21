#!/usr/bin/env node
import path from 'path';
import fs from 'fs/promises';
import { extractFromMarkdown, extractFromPdf } from './index';

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: ts-node src/agents/agentA/runner.ts <input-file> [--outdir=path]');
    process.exit(2);
  }

  let outdir = path.join(process.cwd(), 'workspace', 'requirements');
  const inputs: string[] = [];
  for (const a of args) {
    if (a.startsWith('--outdir=')) {
      outdir = path.isAbsolute(a.split('=')[1]) ? a.split('=')[1] : path.join(process.cwd(), a.split('=')[1]);
    } else {
      inputs.push(a);
    }
  }

  await ensureDir(outdir);

  for (const input of inputs) {
    const absolute = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
    const ext = path.extname(absolute).toLowerCase();
    let reqs;
    try {
      if (ext === '.md' || ext === '.markdown' || ext === '.txt') {
        reqs = await extractFromMarkdown(absolute);
      } else if (ext === '.pdf') {
        reqs = await extractFromPdf(absolute);
      } else {
        // default to markdown
        reqs = await extractFromMarkdown(absolute);
      }
    } catch (err) {
      console.error('Error extracting from', input, err);
      continue;
    }

    const base = path.basename(input, ext || '.json');
    const outPath = path.join(outdir, `${base}.requirements.json`);
    await fs.writeFile(outPath, JSON.stringify(reqs, null, 2), 'utf8');
    console.log('Wrote', outPath);
  }
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
