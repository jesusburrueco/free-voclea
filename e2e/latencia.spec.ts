import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('los ajustes muestran la latencia estimada al activar el micro', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  const latencia = page.locator('#latencia');
  await expect(latencia).toContainText('activa el micro');
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(latencia).toContainText(/Latencia estimada \d+ ms/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/latencia.png', fullPage: true });
});
