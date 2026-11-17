import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test('el preset de mapeo de acordes se elige en Acordes y se guarda en el perfil', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Acordes' }).click();
  const mapeo = page.getByLabel('Mapeo de acordes');
  await expect(mapeo).toBeVisible();
  await expect(mapeo).toHaveValue('triads');
  const caja = await mapeo.boundingBox();
  expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
  await mapeo.selectOption({ label: 'Pop' });
  await expect(mapeo).toHaveValue('pop');
  await page.screenshot({ path: 'artifacts/mapeo-acordes.png', fullPage: true });

  await page.reload();
  await abrirTodo(page);
  await expect(page.getByLabel('Mapeo de acordes')).toHaveValue('pop');

  await page.getByLabel('Nombre del perfil').fill('Pop');
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await expect(page.getByText('Perfil "Pop" guardado.')).toBeVisible();
  await page.getByLabel('Mapeo de acordes').selectOption('popPlus');
  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Cargar perfil' }).click()]);
  await abrirTodo(page);
  await expect(page.getByLabel('Mapeo de acordes')).toHaveValue('pop');
});
