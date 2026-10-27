import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('los sonidos de beatbox se nombran, mapean y se recuerdan', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByLabel('Nombre del sonido 1').fill('Mi bombo');
  await page.getByLabel('Nombre del sonido 1').blur();
  await page.getByLabel('Nota MIDI del sonido 1').fill('999');
  await page.getByLabel('Nota MIDI del sonido 1').blur();
  await expect(page.getByLabel('Nota MIDI del sonido 1')).toHaveValue('127');
  await page.getByLabel('Voz interna del sonido 2').selectOption('clap');
  await page.getByRole('button', { name: 'Grabar sonido 1' }).click();
  await expect(page.locator('#trig-estado')).toHaveText('Activa el micro para grabar.');
  await page.reload();
  await abrirTodo(page);
  await expect(page.getByLabel('Nombre del sonido 1')).toHaveValue('Mi bombo');
  await expect(page.getByLabel('Voz interna del sonido 2')).toHaveValue('clap');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/triggers.png', fullPage: true });
});

test('con el micro falso se pueden grabar ejemplos de un sonido', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado')).toHaveText('Micro activo');
  await page.getByRole('button', { name: 'Grabar sonido 3' }).click();
  await expect(page.getByText('Listo.')).toBeVisible({ timeout: 25000 });
  await expect(page.getByText('5 ejemplos').first()).toBeVisible();
});
