import { expect, test } from '@playwright/test';

test('expone manifest y registra el service worker', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(href as string);
  expect(res.ok()).toBe(true);
  expect((await res.json()).display).toBe('standalone');

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toContain('localhost:4173');
  await page.screenshot({ path: 'artifacts/pwa.png', fullPage: true });
});
