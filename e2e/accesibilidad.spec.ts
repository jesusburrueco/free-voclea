import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test('todos los controles tienen nombre accesible y el tema claro cambia los colores', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await abrirTodo(page);
  const sinNombre = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, input, select')]
      .filter((el) => {
        const labelled = el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || el.textContent?.trim();
        return !labelled;
      })
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(sinNombre).toEqual([]);

  const fondo = (): Promise<string> => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const oscuro = await fondo();
  await page.getByLabel('Tema').selectOption('claro');
  const claro = await fondo();
  expect(claro).not.toBe(oscuro);
  await page.screenshot({ path: 'artifacts/tema-claro.png' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
});

test('los objetivos tactiles miden al menos 44px', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, select, input[type="number"], input[type="text"], summary')]
      .filter((el) => el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().height < 43.5)
      .map((el) => `${el.tagName}#${el.id}:${Math.round(el.getBoundingClientRect().height)}`),
  );
  expect(pequenos).toEqual([]);
});
