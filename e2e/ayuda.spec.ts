import { expect, test } from '@playwright/test';

test('la pagina de ayuda se abre desde la app y vuelve', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await page.getByRole('link', { name: 'Ayuda' }).click();
  await expect(page.getByRole('heading', { name: 'Ayuda', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Beatbox' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/ayuda.png', fullPage: true });
  await page.getByRole('link', { name: 'Volver a la app' }).click();
  await expect(page.getByRole('button', { name: 'Activar micro' })).toBeVisible();
});
