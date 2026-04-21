import { test, expect } from '@playwright/test';
import { parseMarkdown } from '../../src/agents/agentA/parser';

test.describe('Agent A parser', () => {
  test('parses sample markdown into two requirements with structured steps', () => {
    const md = `# Login Form Rendering

- The page shall display a heading indicating it is a "Login Page".
- The page shall display an input field labeled "Username".
- The page shall display an input field labeled "Password".
- The page shall display a "Login" button.

# Successful Login with Valid Credentials

- Enter "tomsmith" in the Username field.
- Enter "SuperSecretPassword!" in the Password field.
- Click the "Login" button -> Expect navigation to secure area.
`;

    const reqs = parseMarkdown(md);
    expect(reqs.length).toBe(2);

    const [r1, r2] = reqs;
    expect(r1.title).toBe('Login Form Rendering');
    expect(r1.steps.length).toBeGreaterThanOrEqual(4);

    expect(r2.title).toBe('Successful Login with Valid Credentials');
    expect(r2.steps.length).toBe(3);

    // check structured parsing of the second requirement
    const [s1, s2, s3] = r2.steps;
    expect(s1.action).toBe('type');
    expect(s1.value).toBe('tomsmith');
    expect(s1.targetHint?.toLowerCase()).toContain('username');

    expect(s2.action).toBe('type');
    expect(s2.value).toBe('SuperSecretPassword!');
    expect(s2.targetHint?.toLowerCase()).toContain('password');

    expect(s3.action).toBe('click');
    expect(s3.targetHint).toBeDefined();
    expect(s3.expected).toBeDefined();
  });
});
