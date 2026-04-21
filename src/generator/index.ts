import fs from 'fs/promises';
import path from 'path';

type Requirement = {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  steps: Array<{
    action: string;
    targetHint?: string;
    value?: string | number | null;
    expected?: string;
    targetLocator?: { type: string; value: string; suggested?: string };
  }>;
};

async function ensureDir(p: string) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch (e) {
    // ignore
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

function generateTestFileContent(reqs: Requirement[], suiteName = 'Generated Tests') {
  const lines: string[] = [];
  lines.push("import { test, expect } from '@playwright/test';\n");
  lines.push(`test.describe('${suiteName}', () => {`);

  for (const req of reqs) {
    const id = req.id || 'UNKN';
    const title = (req.title || id).replace(/'/g, "\'");
    lines.push(`  // BEGIN_REQ: ${id}`);
    lines.push(`  test('${id} - ${title}', async ({ page }) => {`);

    // If there's no sourceUrl but the title mentions login, default to the-internet login
    if (req.sourceUrl) {
      lines.push(`    // source: ${req.sourceUrl}`);
      lines.push(`    await page.goto('${req.sourceUrl}');`);
    } else if (/login/i.test(req.title)) {
      lines.push(`    // default source for login`);
      lines.push(`    await page.goto('https://the-internet.herokuapp.com/login');`);
    }

    for (const step of req.steps) {
      const comment = `    // ${step.action}${step.targetHint ? ' -> ' + step.targetHint : ''}`;
      lines.push(comment);

      // prefer suggested locator when available
      if (step.targetLocator && step.targetLocator.suggested) {
        const suggested = step.targetLocator.suggested;
        const val = step.targetLocator.value;
        // navigation
        if (step.action === 'navigate' && step.targetLocator.type === 'url') {
          lines.push(`    await page.goto(${JSON.stringify(step.targetLocator.value)});`);
        }
        // typing into inputs
        else if (step.action === 'type' && step.value !== undefined) {
          if (suggested.startsWith('getByLabel')) {
            lines.push(`    await page.getByLabel(${JSON.stringify(val)}).fill(${JSON.stringify(String(step.value))});`);
          } else if (suggested.startsWith('locator')) {
            lines.push(`    await page.locator(${JSON.stringify(val)}).fill(${JSON.stringify(String(step.value))});`);
          } else {
            // fallback to fill using getByPlaceholder or getByLabel
            lines.push(`    // TODO: refine locator for typing; suggested: ${suggested}`);
            lines.push(`    // Example fallback:`);
            lines.push(`    // await page.getByLabel(${JSON.stringify(val)}).fill(${JSON.stringify(String(step.value))});`);
          }
        }
        // clicks and interactions
        else if (step.action === 'click' || step.action === 'interact' || step.action === 'select') {
          // conservative click heuristics: avoid clicking headings or descriptive text like 'Login Page'
          const shouldClickText = (text: string) => {
            const t = (text || '').toLowerCase();
            if (/page|heading|title/.test(t)) return false;
            if (t.length > 40) return false;
            if (/(login|submit|add|delete|close|ok|cancel|confirm|yes|no|view profile)/i.test(t)) return true;
            // otherwise click only short text
            return t.length < 20;
          };

          if (suggested.startsWith('getByText')) {
            if (shouldClickText(val)) {
              // prefer button role when clicking text to avoid matching headings
              lines.push(`    await page.getByRole('button', { name: ${JSON.stringify(val)} }).click();`);
            } else {
              lines.push(`    // Skipping click for descriptive text: ${JSON.stringify(val)}`);
            }
          } else if (suggested.startsWith('getByLabel')) {
            // for label-click, usually click the associated control
            lines.push(`    await page.getByLabel(${JSON.stringify(val)}).click();`);
          } else if (suggested.startsWith('locator')) {
            lines.push(`    await page.locator(${JSON.stringify(val)}).click();`);
          } else {
            lines.push(`    // TODO: interact using suggested locator: ${suggested}`);
          }
        }
        // assertions
        else if (step.action === 'assert' || step.expected) {
          if (step.expected) {
            lines.push(`    await expect(page.getByText(${JSON.stringify(step.expected)})).toBeVisible();`);
          }
        } else {
          lines.push(`    // Suggested locator: ${suggested}`);
        }
      } else {
        // no suggested locator - emit comment placeholder
        lines.push(`    // TODO: implement action: ${step.action} for targetHint: ${step.targetHint || ''}`);
      }
      if (step.expected && step.action !== 'assert') {
        lines.push(`    // expected: ${step.expected}`);
      }
    }

    lines.push('  });');
    lines.push(`  // END_REQ: ${id}\n`);
  }

  lines.push('});');
  return lines.join('\n');
}

async function run() {
  const args = process.argv.slice(2);
  const input = args[0] || path.join(process.cwd(), 'workspace', 'requirements', 'sample-requirements.requirements.json');
  const outdir = args[1] || path.join(process.cwd(), 'workspace', 'generated-tests');

  await ensureDir(outdir);

  const content = await fs.readFile(input, 'utf8');
  const reqs: Requirement[] = JSON.parse(content);
  const base = sanitizeFilename(path.basename(input, path.extname(input)));
  const filePath = path.join(outdir, `${base}.spec.ts`);

  const fileContent = generateTestFileContent(reqs, `Auto-generated from ${path.basename(input)}`);
  await fs.writeFile(filePath, fileContent, 'utf8');
  console.log('Generated', filePath);
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
