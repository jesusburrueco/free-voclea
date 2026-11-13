import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

/** WAV mono 16 bits con una melodia C E G C (senos de 0,5 s separados por silencios), en bucle por Chromium. */
function melodiaWav(path: string): void {
  const sr = 48000;
  const notas = [261.63, 329.63, 392.0, 523.25];
  const nota = Math.round(0.5 * sr);
  const hueco = Math.round(0.15 * sr);
  const n = notas.length * (nota + hueco);
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
  let i = 0;
  for (const f of notas) {
    for (let k = 0; k < nota; k++, i++) {
      const env = Math.min(1, k / 480, (nota - k) / 480);
      buf.writeInt16LE(Math.round(0.5 * env * Math.sin((2 * Math.PI * f * k) / sr) * 32767), 44 + i * 2);
    }
    i += hueco;
  }
  writeFileSync(path, buf);
}

const wav = resolve('artifacts/playwright/melodia.wav');
mkdirSync(resolve('artifacts/playwright'), { recursive: true });
melodiaWav(wav);

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`, '--autoplay-policy=no-user-gesture-required'],
  },
});

test('grabar una melodia muestra acordes sugeridos', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado')).toHaveText('Micro activo');
  const grabar = page.getByRole('button', { name: 'Grabar melodia' });
  await grabar.click();
  await expect(page.getByRole('button', { name: 'Parar y sugerir' })).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: 'Parar y sugerir' }).click();
  const acordes = page.getByRole('list', { name: 'Acordes sugeridos' }).locator('li');
  await expect.poll(async () => acordes.count()).toBeGreaterThan(0);
  await expect(page.locator('#estado-sugerencia')).toContainText('acordes sugeridos');
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset['panel'] !== 'acordes'));
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  const alto = await page.getByRole('button', { name: 'Grabar melodia' }).evaluate((b) => b.getBoundingClientRect().height);
  expect(alto).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'artifacts/sugerir-acordes.png', fullPage: true });
});
