import { expect, test } from '@playwright/test';

test('el pitch bend se activa y el rango se limita a 1..48', async ({ page }) => {
  await page.goto('/');
  const bend = page.getByRole('checkbox', { name: 'Pitch bend' });
  const rango = page.getByLabel('Rango de bend (semitonos)');
  await expect(bend).not.toBeChecked();
  await expect(rango).toHaveValue('2');
  await bend.check();
  await rango.fill('100');
  await rango.blur();
  await expect(rango).toHaveValue('48');
  await rango.fill('0');
  await rango.blur();
  await expect(rango).toHaveValue('1');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/bend.png', fullPage: true });
});
