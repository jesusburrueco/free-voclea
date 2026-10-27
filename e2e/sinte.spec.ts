import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('el sinte interno se puede silenciar y reactivar con el micro activo', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const sonido = page.getByRole('checkbox', { name: 'Sonido interno' });
  await expect(sonido).toBeChecked();
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.getByRole('status')).toHaveText('Micro activo');
  await sonido.uncheck();
  await sonido.check();
  await expect(sonido).toBeChecked();
  await sonido.uncheck();
  await expect(sonido).not.toBeChecked();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/sinte.png', fullPage: true });
});
