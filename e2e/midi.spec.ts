import { expect, test } from '@playwright/test';
import { abrirTodo } from './helpers';

test('sin Web MIDI la app informa y sigue usable con sonido interno', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: undefined, configurable: true });
  });
  await page.goto('/');
  await abrirTodo(page);
  await expect(page.getByRole('button', { name: 'Activar MIDI' })).toBeDisabled();
  await expect(page.getByText('no admite Web MIDI')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activar micro' })).toBeEnabled();
});

test('con Web MIDI se listan los puertos y se puede elegir uno', async ({ page }) => {
  await page.addInitScript(() => {
    const out = { id: 'p1', name: 'Puerto de prueba', send: () => undefined };
    const access = { outputs: { values: () => [out] }, onstatechange: null };
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: () => Promise.resolve(access), configurable: true });
  });
  await page.goto('/');
  await abrirTodo(page);
  await page.getByRole('button', { name: 'Activar MIDI' }).click();
  const puerto = page.getByLabel('Puerto MIDI', { exact: true });
  await expect(puerto).toBeEnabled();
  await puerto.selectOption('p1');
  await expect(puerto).toHaveValue('p1');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'artifacts/midi.png', fullPage: true });
});
