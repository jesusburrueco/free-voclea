import { expect, test } from '@playwright/test';

test.use({
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
  permissions: ['microphone'],
});

test('contexto suspendido: avisa y se reanuda con un gesto', async ({ page }) => {
  await page.addInitScript(() => {
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig {
      constructor(opts?: AudioContextOptions) {
        super(opts);
        (window as unknown as { __ctx: AudioContext }).__ctx = this;
      }
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado')).toContainText('Micro activo');
  await expect(page.locator('#reanudar')).toBeHidden();

  await page.evaluate(() => (window as unknown as { __ctx: AudioContext }).__ctx.suspend());
  await expect(page.locator('#estado')).toContainText('Toca para reanudar');
  const boton = page.getByRole('button', { name: 'Reanudar audio' });
  await expect(boton).toBeVisible();
  expect((await boton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'artifacts/contexto.png', fullPage: true });

  await boton.click();
  await expect(page.locator('#estado')).toContainText('Micro activo');
  await expect(boton).toBeHidden();
});
