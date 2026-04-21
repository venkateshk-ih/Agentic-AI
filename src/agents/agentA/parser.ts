import fs from 'fs/promises';

export interface Step {
  action: string;
  targetHint?: string;
  value?: string | number | null;
  expected?: string;
  targetLocator?: { type: string; value: string; suggested?: string };
}

export interface Requirement {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  confidence?: number;
  steps: Step[];
}

/**
 * Parse a markdown string into Requirement objects.
 * Heuristic: top-level headings (#) denote new requirements; following bullet lists (- or *) are steps.
 */
export function parseMarkdown(markdown: string): Requirement[] {
  const lines = markdown.split(/\r?\n/);
  const reqs: Requirement[] = [];
  let current: Requirement | null = null;
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headingMatch = line.match(/^#{1,3}\s+(.*)/);
    if (headingMatch) {
      // start a new requirement
      if (current) reqs.push(current);
      const rawTitle = headingMatch[1].trim();
      // try to detect an FR ID in the heading (e.g., FR-FA-01)
      const frMatch = rawTitle.match(/(FR-[A-Z0-9-]+)/i);
      const id = frMatch ? frMatch[1].toUpperCase() : `REQ-${idCounter.toString().padStart(3, '0')}`;
      // try to extract a human-friendly title without the FR prefix
      const title = rawTitle.replace(/^(FR-[A-Z0-9-]+[:\-–—]?\s*)/i, '').trim();
      current = {
        id,
        title: title || rawTitle,
        description: '',
        steps: [],
        confidence: 0.9,
      };
      idCounter++;
      continue;
    }

    // bullet step
    const bulletMatch = line.match(/^(?:[-*+]|\d+\.)\s+(.*)/);
    if (bulletMatch && current) {
      const text = bulletMatch[1].trim();
      // parse common action patterns (enter/type, click/select, navigate, expect)
      const step: Step = { action: '', targetHint: undefined, expected: undefined };

      // expected via arrow -> or 'Expect' keywords
      const arrowParts = text.split('->').map((s) => s.trim());
      if (arrowParts.length > 1) {
        // left side is action, right side is expected
        const left = arrowParts[0];
        step.expected = arrowParts.slice(1).join(' -> ');
        // continue parsing left side for action/target
        parseActionIntoStep(left, step);
      } else if (/expect(s)?\b/i.test(text)) {
        // split on Expect word
        const m = text.match(/(.*)\bExpect(?:ed)?[:\s-]*([\s\S]*)/i);
        if (m) {
          parseActionIntoStep(m[1].trim(), step);
          step.expected = m[2].trim();
        } else {
          parseActionIntoStep(text, step);
        }
      } else {
        parseActionIntoStep(text, step);
      }

      // ensure there's an action; fallback to 'note'
      if (!step.action) step.action = 'note';
      current.steps.push(step);
      continue;
    }

    // treat other lines as description for current requirement
    if (current) {
      // detect source URLs in description lines
      const urlMatch = line.match(/https?:\/\/[^\s)]+/i);
      if (urlMatch && !current.sourceUrl) {
        current.sourceUrl = urlMatch[0];
      }
      current.description = (current.description ? current.description + '\n' : '') + line;
    }
  }

  if (current) reqs.push(current);
  // Post-process steps to add normalized locator hints
  for (const r of reqs) {
    for (const s of r.steps) {
      if (s.targetHint) {
        s.targetLocator = inferLocatorFromHint(s.targetHint);
      }
    }
  }

  return reqs;
}


function parseActionIntoStep(text: string, step: Step) {
  const t = text.trim();
  // extract quoted values "value" or 'value'
  const quoteMatch = t.match(/\"([^\"]+)\"|\'([^']+)\'/);
  const quoted = quoteMatch ? (quoteMatch[1] || quoteMatch[2]) : undefined;

  if (/^enter\b|^type\b|\bfill\b/i.test(t)) {
    step.action = 'type';
    if (quoted) step.value = quoted;
    // try to detect target field after 'in' or 'into'
    const inMatch = t.match(/in(?:to| the)?\s+"?([A-Za-z0-9 _-]+)"?\s*(?:field|box)?/i);
    if (inMatch) step.targetHint = inMatch[1].trim();
    else if (!step.targetHint && quoted && /\b(username|password|email|name)\b/i.test(t)) {
      step.targetHint = quoted;
    }
    return;
  }

  if (/^click\b|^press\b|\bclick\b|\bselect\b|\bchoose\b/i.test(t)) {
    // click or select action
    if (/select|choose/i.test(t)) step.action = 'select';
    else step.action = 'click';
    if (quoted) step.targetHint = quoted;
    else {
      // try to capture label before 'button' or 'link'
      const labelMatch = t.match(/(?:click|press)\s+(?:the\s+)?(?:button|link)?\s*"?([A-Za-z0-9 _-]+)"?/i);
      if (labelMatch) step.targetHint = labelMatch[1].trim();
    }
    return;
  }

  if (/navigate\b|go to\b|open\b/i.test(t)) {
    step.action = 'navigate';
    const urlMatch = t.match(/https?:\/\/[^\s)]+/i);
    if (urlMatch) step.targetHint = urlMatch[0];
    return;
  }

  if (/assert|verify|should\s+see|expect/i.test(t)) {
    step.action = 'assert';
    if (quoted) step.expected = quoted;
    else {
      const m = t.match(/(?:expect|assert|verify|should see)[:\s-]*([\s\S]+)/i);
      if (m) step.expected = m[1].trim();
    }
    return;
  }

  // fallback: try to detect labels or simple click/enter patterns
  if (quoted) {
    step.action = 'interact';
    step.targetHint = quoted;
    return;
  }
  // last resort: store the raw text as action
  step.action = t;
}

function inferLocatorFromHint(hint?: string): { type: string; value: string; suggested?: string } {
  const h = (hint || '').trim();
  const lower = h.toLowerCase();

  const stripWords = (s: string) => s.replace(/\b(field|input|box|textbox|button|link)\b/ig, '').trim();

  // common fields -> use label or name
  if (/username|user name|user_name/i.test(h)) {
    const v = 'Username';
    return { type: 'label', value: v, suggested: `getByLabel(\"${v}\")` };
  }
  if (/password/i.test(h)) {
    const v = 'Password';
    return { type: 'label', value: v, suggested: `getByLabel(\"${v}\")` };
  }
  if (/email/i.test(h)) {
    const v = 'E-mail';
    return { type: 'label', value: v, suggested: `getByLabel(\"${v}\")` };
  }

  // if hint looks like a selector (starts with # or .) treat as css
  if (/^[#.][A-Za-z0-9_-]+/.test(h)) return { type: 'css', value: h, suggested: `locator(\"${h}\")` };

  // if hint is a URL
  if (/^https?:\/\//i.test(h)) return { type: 'url', value: h, suggested: `goto(\"${h}\")` };

  // buttons or links -> text (normalize by stripping words)
  if (/(button|link|login|submit|close|add|delete)/i.test(h)) {
    const v = stripWords(h) || h;
    return { type: 'text', value: v, suggested: `getByText(\"${v}\")` };
  }

  // if hint contains 'field' or 'input' treat as label/name
  if (/(field|input|box|textbox)/i.test(h)) {
    const v = stripWords(h) || h;
    return { type: 'label', value: v, suggested: `getByLabel(\"${v}\")` };
  }

  // fallback to text
  const v = stripWords(h) || h;
  return { type: 'text', value: v, suggested: `getByText(\"${v}\")` };
}

export async function parseMarkdownFile(path: string): Promise<Requirement[]> {
  const text = await fs.readFile(path, 'utf8');
  return parseMarkdown(text);
}

export async function parsePdfFile(path: string): Promise<Requirement[]> {
  // Attempt to dynamically import `pdf-parse` so the module is optional.
  // If the package is not installed, provide a helpful error message.
  let pdfParse: any;
  try {
    // dynamic import to avoid hard dependency in environments that don't need PDF parsing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pdfParse = require('pdf-parse');
  } catch (err) {
    throw new Error(
      "PDF parsing requires the 'pdf-parse' package. Install it with `npm install pdf-parse` to enable PDF extraction."
    );
  }

  const fs = await import('fs/promises');
  const data = await fs.readFile(path);
  const result = await pdfParse(data);
  // pdf-parse returns { text } which is the extracted plain text
  const text: string = result && result.text ? result.text : '';

  // Feed the extracted text into the markdown parser heuristics. PDFs often don't
  // include markdown structure, but headings may be recognized if the PDF had them.
  // As a fallback, split paragraphs into pseudo-headings when empty lines separate sections.
  const normalized = text.replace(/\r\n/g, '\n');
  // Simple heuristic: convert lines with ALL CAPS or lines that end with ':' into headings
  const lines = normalized.split('\n');
  const reconstructed: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) {
      reconstructed.push('');
      continue;
    }
    if (/^[A-Z0-9\-\s]{3,}$/.test(ln) || /:$/.test(ln)) {
      reconstructed.push('# ' + ln);
    } else if (/^\d+\./.test(ln) || /^[-*+]\s+/.test(ln)) {
      reconstructed.push(ln);
    } else {
      reconstructed.push(ln);
    }
  }

  const pseudoMarkdown = reconstructed.join('\n');
  return parseMarkdown(pseudoMarkdown);
}
