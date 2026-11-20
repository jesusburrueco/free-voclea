import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test('el teclado silencia notas y la rueda se muestra', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const fa = page.getByRole('button', { name: 'F# permitida' });
  await fa.tap().catch(() => fa.click());
  await expect(page.getByRole('button', { name: 'F# silenciada' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Rueda de afinacion' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/teclado.png', fullPage: true });
});

test('pulsar un sector de la rueda silencia la nota y lo refleja el teclado', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const rueda = page.getByRole('img', { name: 'Rueda de afinacion' });
  const sector = rueda.locator('path[data-pc="2"]');
  const box = await sector.boundingBox();
  expect(box && Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
  await sector.tap().catch(() => sector.click());
  await expect(page.getByRole('button', { name: 'D silenciada' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sector).toHaveClass(/silenciada/);
  await page.getByRole('button', { name: 'D silenciada' }).tap().catch(() => page.getByRole('button', { name: 'D silenciada' }).click());
  await expect(sector).not.toHaveClass(/silenciada/);
  await sector.tap().catch(() => sector.click());
  await rueda.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/rueda-silenciar.png' });
  await page.reload();
  await abrirTodo(page);
  await expect(page.getByRole('img', { name: 'Rueda de afinacion' }).locator('path[data-pc="2"]')).toHaveClass(/silenciada/);
});
