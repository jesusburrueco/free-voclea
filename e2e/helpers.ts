import type { Page } from '@playwright/test';

/** Muestra todas las pestanas y abre todos los grupos plegables para poder usar sus controles. */
export async function abrirTodo(page: Page): Promise<void> {
  await page.evaluate(() => {
      document.querySelectorAll('details').forEach((d) => (d.open = true));
      document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = false));
    });
}
