import { expect, test } from '@playwright/test';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('activar el micro arranca el worklet y mueve el medidor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.getByRole('status')).toHaveText('Micro activo');
  await expect(page.locator('#estado[data-activo="1"]')).toBeAttached();
  await expect.poll(async () => page.locator('#nivel').evaluate((m: HTMLMeterElement) => m.value)).toBeGreaterThan(-100);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/audio.png', fullPage: true });
});
