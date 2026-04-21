import fs from 'fs/promises';
import path from 'path';

/**
 * Apply a minimal patch to a generated test file by replacing the lines within a BEGIN_REQ/END_REQ block
 * matching a requirement id. The replacement should be the new block body (array of lines) excluding anchors.
 */
export async function patchGeneratedTest(filePath: string, reqId: string, newBlockLines: string[]) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const content = await fs.readFile(abs, 'utf8');
  const begin = `// BEGIN_REQ: ${reqId}`;
  const end = `// END_REQ: ${reqId}`;
  const idxBegin = content.indexOf(begin);
  const idxEnd = content.indexOf(end);
  if (idxBegin === -1 || idxEnd === -1 || idxEnd < idxBegin) {
    throw new Error(`Could not find anchors for ${reqId} in ${filePath}`);
  }

  const before = content.slice(0, idxBegin + begin.length);
  const after = content.slice(idxEnd);
  const middle = '\n' + newBlockLines.join('\n') + '\n';
  const patched = before + middle + after;
  await fs.writeFile(abs, patched, 'utf8');
  return abs;
}
