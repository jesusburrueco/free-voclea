import { expect, test } from '@playwright/test';

test('la barra de pestanas navega entre secciones sin desbordar a 375px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Tocar' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Activar micro' })).toBeVisible();
  for (const [tab, visible] of [
    ['Melodia', 'Octava de la melodia'],
    ['Acordes', 'Inversion'],
    ['Beatbox', 'Nombre del sonido 1'],
    ['Ajustes', 'Tema'],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel(visible, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Activar micro' })).toBeHidden();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `artifacts/pestana-${tab.toLowerCase()}.png`, fullPage: true });
  }
  await page.getByRole('tab', { name: 'Tocar' }).click();
  await page.getByRole('button', { name: 'Pad Bombo' }).click();
  await expect(page.getByRole('checkbox', { name: 'Melodia' })).toBeChecked();
  await page.screenshot({ path: 'artifacts/pestana-tocar.png', fullPage: true });
});

test('la barra de pestanas queda fija abajo aunque se haga scroll', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Melodia' }).click();
  const nav = page.getByRole('tablist');
  const antes = await nav.boundingBox();
  await page.locator('main').evaluate((m) => m.scrollTo({ top: m.scrollHeight }));
  const scroll = await page.locator('main').evaluate((m) => m.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  const despues = await nav.boundingBox();
  expect(despues).toEqual(antes);
  const viewport = page.viewportSize();
  expect(Math.round((despues?.y ?? 0) + (despues?.height ?? 0))).toBe(viewport?.height);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
