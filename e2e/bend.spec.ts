import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test('el pitch bend se activa y el rango se limita a 1..48', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const bend = page.getByLabel('Destino del pitch bend');
  const rango = page.getByLabel('Rango de bend (semitonos)');
  await expect(bend).toHaveValue('ninguno');
  await expect(rango).toHaveValue('2');
  await bend.selectOption('melodia');
  await page.getByLabel('Modo de bend').selectOption('anclado');
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

test('se puede elegir tonalidad y escala', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('combobox', { name: 'Tonalidad' }).selectOption('2');
  await page.getByRole('combobox', { name: 'Escala' }).selectOption('minor-pentatonic');
  await expect(page.getByRole('combobox', { name: 'Escala' })).toHaveValue('minor-pentatonic');
  await page.screenshot({ path: 'artifacts/escala.png', fullPage: true });
});
