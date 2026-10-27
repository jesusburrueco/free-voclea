import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { abrirTodo } from './helpers';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    ...(process.env['CHROMIUM_PATH'] ? { executablePath: process.env['CHROMIUM_PATH'] } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  },
});

test('los perfiles se guardan, cargan, exportan e importan', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('combobox', { name: 'Escala' }).selectOption('dorian');
  await page.getByLabel('Octava de la melodia').fill('2');
  await page.getByLabel('Octava de la melodia').blur();
  await page.getByLabel('Nombre del perfil').fill('Mi voz');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil "Mi voz" guardado.')).toBeVisible();

  await page.getByRole('combobox', { name: 'Escala' }).selectOption('blues');
  await page.getByLabel('Octava de la melodia').fill('-1');
  await page.getByLabel('Octava de la melodia').blur();
  await page.getByRole('button', { name: 'Cargar perfil' }).click();
  await page.waitForLoadState('load');
  await abrirTodo(page);
  await expect(page.getByRole('combobox', { name: 'Escala' })).toHaveValue('dorian');
  await expect(page.getByLabel('Octava de la melodia')).toHaveValue('2');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar perfil' }).click()]);
  const path = await download.path();
  const json = JSON.parse(readFileSync(path, 'utf8')) as { name: string; version: number };
  expect(json).toMatchObject({ name: 'Mi voz', version: 1 });

  await page.getByRole('button', { name: 'Borrar perfil' }).click();
  await expect(page.getByText('Perfil "Mi voz" borrado.')).toBeVisible();
  await page.getByLabel('Importar perfil (.json)').setInputFiles({ name: 'otro.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...json, name: 'Importado' })) });
  await expect(page.getByText('Perfil "Importado" importado.')).toBeVisible();
  await page.getByLabel('Importar perfil (.json)').setInputFiles({ name: 'mal.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByText('El archivo no es un perfil valido.')).toBeVisible();
  await page.screenshot({ path: 'artifacts/perfiles.png', fullPage: true });
});

test('la calibracion guiada recorre los pasos y fija un umbral', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Calibrar' }).click();
  await expect(page.locator('#cal-estado')).toHaveText('Activa el micro para calibrar.');
  await page.getByRole('button', { name: 'Activar micro' }).click();
  await expect(page.locator('#estado')).toHaveText('Micro activo');
  await page.getByRole('button', { name: 'Calibrar' }).click();
  await expect(page.locator('#cal-estado')).toContainText('Silencio');
  await expect(page.locator('#cal-estado')).toContainText(/Umbral -?\d+ dB|Listo: umbral -?\d+ dB/, { timeout: 20000 });
  await page.screenshot({ path: 'artifacts/calibracion.png', fullPage: true });
});

test('los ajustes de entrada y de interfaz se recuerdan', async ({ page }) => {
  await page.goto('/');
  await abrirTodo(page);
  await page.getByLabel('Tamano de la interfaz').selectOption('150');
  await page.getByLabel('Nivel de entrada en dB').fill('6');
  await page.getByLabel('Nivel de entrada en dB').dispatchEvent('change');
  await page.getByLabel('Destino del sonido 1').selectOption('midi');
  await page.reload();
  await abrirTodo(page);
  await expect(page.getByLabel('Tamano de la interfaz')).toHaveValue('150');
  await expect(page.getByLabel('Nivel de entrada en dB')).toHaveValue('6');
  await expect(page.getByLabel('Destino del sonido 1')).toHaveValue('midi');
  expect(await page.evaluate(() => document.body.style.fontSize)).toBe('150%');
});
