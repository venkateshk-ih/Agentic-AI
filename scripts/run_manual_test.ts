import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log('goto login');
    await page.goto('https://the-internet.herokuapp.com/login');
    console.log('click username label');
    await page.getByLabel('Username').click();
    console.log('click password label');
    await page.getByLabel('Password').click();
  console.log('click login button');
  await page.getByRole('button', { name: 'Login' }).click();
    console.log('finished without error');
  } catch (e) {
    console.error('Error during manual run:', e);
  } finally {
    await browser.close();
  }
}

main();
