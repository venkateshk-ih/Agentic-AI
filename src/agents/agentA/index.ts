import { parseMarkdownFile, Requirement } from './parser';
import path from 'path';

export async function extractFromMarkdown(filePath: string): Promise<Requirement[]> {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const reqs = await parseMarkdownFile(absolute);
  return reqs;
}

export async function extractFromPdf(filePath: string): Promise<Requirement[]> {
  // For now delegate to parsePdfFile which is a stub.
  const mod = await import('./parser');
  // @ts-ignore
  return mod.parsePdfFile(filePath);
}

// Simple CLI runner for quick manual tests
if (require.main === module) {
  (async () => {
    const arg = process.argv[2];
    if (!arg) {
      console.error('Usage: ts-node src/agents/agentA/index.ts <requirements.md>');
      process.exit(2);
    }
    try {
      const out = await extractFromMarkdown(arg);
      console.log(JSON.stringify(out, null, 2));
    } catch (e) {
      console.error('Extraction failed:', e);
      process.exit(1);
    }
  })();
}
