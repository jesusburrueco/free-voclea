import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

/** WAV mono 16 bits con un Do (261,63 Hz) sostenido 2 s y 1,2 s de silencio, en bucle por Chromium. */
function doWav(path: string): void {
  const sr = 48000;
  const nota = 2 * sr;
  const n = nota + Math.round(1.2 * sr);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let k = 0; k < nota; k++) {
    const env = Math.min(1, k / 480, (nota - k) / 480);
    buf.writeInt16LE(Math.round(0.5 * env * Math.sin((2 * Math.PI * 261.63 * k) / sr) * 32767), 44 + k * 2);
  }
  writeFileSync(path, buf);
}

const wav = resolve('artifacts/playwright/do-sostenido.wav');
mkdirSync(resolve('artifacts/playwright'), { recursive: true });
doWav(wav);

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
  },
});

test('en modo acordes el teclado marca las notas extra del acorde', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.locator('#tonica').selectOption('0');
  await page.locator('#escala').selectOption('major');
  await page.getByLabel('Acordes', { exact: true }).check();
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado')).toHaveText('Micro activo');
  const teclado = page.getByRole('group', { name: 'Teclado de notas permitidas' });
  await expect(teclado.locator('button[data-pc="4"]')).toHaveClass(/acorde/, { timeout: 8000 });
  await expect(teclado.locator('button[data-pc="7"]')).toHaveClass(/acorde/);
  await expect(teclado.locator('button[data-pc="0"]')).not.toHaveClass(/acorde/);
  await expect(page.getByRole('button', { name: 'E permitida, nota del acorde' })).toBeVisible();
  const box = await teclado.locator('button[data-pc="4"]').boundingBox();
  expect(box && box.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await teclado.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/teclado-acorde.png' });
  await page.waitForFunction(() => document.querySelectorAll('.teclado button.acorde').length === 0, undefined, { polling: 50, timeout: 10000 });
});
