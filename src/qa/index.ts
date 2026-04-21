import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export type QAReport = {
  ok: boolean;
  issues: Array<{
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
    reqId?: string;
  }>;
};

/**
 * Run Playwright tests for a given test file (or default tests/) and produce a QA report.
 * The function executes `npx playwright test` and inspects the `playwright-report/data` markdown
 * messages (Playwright creates a markdown file with failure context). We parse that to create suggestions.
 */
export async function runQA(testPattern = 'tests/generated.spec.ts'): Promise<QAReport> {
  console.log('QA: running Playwright tests for', testPattern);
  const res = spawnSync('npx', ['playwright', 'test', testPattern, '--config=playwright.config.ts'], {
    encoding: 'utf8',
    stdio: 'inherit',
  });

  // Inspect playwright-report/data for any markdown files with failure hints
  const dataDir = path.join(process.cwd(), 'playwright-report', 'data');
  let report: QAReport = { ok: true, issues: [] };
  try {
    const entries = await fs.readdir(dataDir);
    for (const e of entries) {
      if (e.endsWith('.md')) {
        const md = await fs.readFile(path.join(dataDir, e), 'utf8');
        // simple parse: look for 'Test info' and 'Error details' sections
        const issue = parseMdIssue(md);
        if (issue) {
          report.ok = false;
          report.issues.push(issue);
        }
      }
    }
  } catch (err) {
    // no report directory or parsing problem is not fatal
    if (res.status === 0) return report;
    // if tests failed but no md file found, add a generic issue using stdout
    report.ok = false;
    report.issues.push({ file: testPattern, message: 'Tests failed; no detailed report found' });
  }

  return report;
}

function parseMdIssue(md: string): QAReport['issues'][0] | null {
  // Heuristic parse to extract failing test name and several common Playwright error types
  const lines = md.split(/\r?\n/);
  let nameLine = lines.find((l) => l.startsWith('- Name:')) || '';
  const name = nameLine.replace('- Name:', '').trim();

  // 1) strict mode / locator ambiguity for getByText
  const strictMatch = md.match(/strict mode violation[\s\S]*?getByText\((?:'|")([^"']+)(?:'|")\)/i);
  if (strictMatch) {
    const text = strictMatch[1];
    return {
      file: name || 'generated test',
      message: `Locator ambiguity: getByText('${text}') matched multiple elements (strict mode).`,
      suggestion: `Replace getByText(${JSON.stringify(text)}) with getByRole('button', { name: ${JSON.stringify(
        text
      )} }) or use a more specific locator such as getByLabel/getByRole/locator(css)`,
    };
  }

  // 2) waiting for selector / timeout
  const timeoutMatch = md.match(/Timeout[\s\S]*?waiting for selector "([^"]+)"/i) || md.match(/waiting for selector "([^"]+)"/i);
  if (timeoutMatch) {
    const sel = timeoutMatch[1];
    return {
      file: name || 'generated test',
      message: `Timeout waiting for selector: ${sel}`,
      suggestion: `Verify selector ${sel} on the page; consider adding waits like page.waitForSelector(${JSON.stringify(
        sel
      )}) or use a more robust locator (getByRole/getByLabel).`,
    };
  }

  // 3) assertion failures (expect(...).toBeVisible / toHaveText / toHaveURL)
  const assertMatch = md.match(/Error:\s*expect\([\s\S]*?\)\.(toBeVisible|toHaveText|toHaveURL)\(\)/i);
  if (assertMatch) {
    const assertType = assertMatch[1];
    return {
      file: name || 'generated test',
      message: `Assertion failed: ${assertType}`,
      suggestion: `Review assertion ${assertType}; if the element is dynamic consider waiting for it (await page.waitForSelector(...)) or relax assertion to check for text presence or URL contains.`,
    };
  }

  // 4) navigation / goto failures
  const navMatch = md.match(/Error[\s\S]*?goto\(|navigation to "([^"]+)" failed/i) || md.match(/navigation to "([^"]+)"/i);
  if (navMatch) {
    const url = navMatch[1] || '';
    return {
      file: name || 'generated test',
      message: `Navigation issue${url ? ` to ${url}` : ''}`,
      suggestion: `Verify the URL is reachable and correct. Consider adding await page.waitForLoadState('load') or increasing navigation timeout.`,
    };
  }

  // 5) generic: include a useful snippet of the Error details if present
  const errBlockIdx = md.indexOf('Error details');
  if (errBlockIdx !== -1) {
    const snippet = lines.slice(errBlockIdx, errBlockIdx + 20).join('\n');
    return { file: name || 'generated test', message: 'Test failure', suggestion: snippet };
  }

  return null;
}
