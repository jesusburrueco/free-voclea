import { expect, test } from '@playwright/test';

test('el teclado silencia notas y la rueda se muestra', async ({ page }) => {
  await page.goto('/');
  const fa = page.getByRole('button', { name: 'F# permitida' });
  await fa.tap().catch(() => fa.click());
  await expect(page.getByRole('button', { name: 'F# silenciada' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Rueda de afinacion' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/teclado.png', fullPage: true });
});
