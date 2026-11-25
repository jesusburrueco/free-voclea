import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('activar el micro arranca el worklet y mueve el medidor', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.getByRole('status')).toHaveText('Micro activo');
  await expect(page.locator('#estado[data-activo="1"]')).toBeAttached();
  await expect
    .poll(async () => page.locator('#nivel').evaluate((m: HTMLMeterElement) => m.value), { timeout: 20000 })
    .toBeGreaterThan(-100);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/audio.png', fullPage: true });
});

test('el selector de entrada lista dispositivos y el micro arranca con el elegido', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.getByRole('status')).toHaveText('Micro activo');
  const select = page.getByLabel('Entrada de audio', { exact: true });
  await expect.poll(async () => select.locator('option').count()).toBeGreaterThan(1);
  const value = await select.locator('option').nth(1).getAttribute('value');
  await select.selectOption(value ?? '');
  await page.getByRole('button', { name: 'Detener' }).click();
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.getByRole('status')).toHaveText('Micro activo');
  expect(await page.evaluate(() => localStorage.getItem('entrada'))).toBe(value);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/entrada.png', fullPage: true });
});
