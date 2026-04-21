import { test, expect } from '@playwright/test';

test.describe('Auto-generated from sample-requirements.requirements.json', () => {
  // BEGIN_REQ: REQ-001
  test('REQ-001 - Login Form Rendering', async ({ page }) => {
    // default source for login
    await page.goto('https://the-internet.herokuapp.com/login');
    // interact -> Login Page
    // Skipping click for descriptive text: "Login Page"
    // interact -> Username
    await page.getByLabel("Username").click();
    // interact -> Password
    await page.getByLabel("Password").click();
    // interact -> Login
    await page.getByRole('button', { name: "Login" }).click();
  });
  // END_REQ: REQ-001

  // BEGIN_REQ: REQ-002
  test('REQ-002 - Successful Login with Valid Credentials', async ({ page }) => {
    // default source for login
    await page.goto('https://the-internet.herokuapp.com/login');
    // type -> Username field
    await page.getByLabel("Username").fill("tomsmith");
    // type -> Password field
    await page.getByLabel("Password").fill("SuperSecretPassword!");
    // click -> Login
    await page.getByRole('button', { name: "Login" }).click();
    // expected: Expect navigation to secure area.
  });
  // END_REQ: REQ-002

});