import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test.use({
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--deny-permission-prompts', '--use-fake-device-for-media-stream'],
  },
});

test('permiso denegado: muestra el motivo y ofrece reintentar', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await expect(page.locator('#permiso')).toBeVisible();
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado[data-error="denied"]')).toContainText('Permiso de micro denegado');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/permiso.png', fullPage: true });
});
