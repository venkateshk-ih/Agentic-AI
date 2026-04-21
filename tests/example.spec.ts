import { test, expect } from '@playwright/test';

test('home page shows main heading', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/');
  const h1 = page.locator('h1');
  await expect(h1).toHaveText(/Welcome to the-internet/);
});
