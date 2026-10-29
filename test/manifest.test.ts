import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
  name: string;
  display: string;
  start_url: string;
  icons: Icon[];
};

describe('manifest PWA', () => {
  it('es instalable: nombre, display standalone y start_url', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
  });

  it('declara iconos 192 y 512 y uno maskable, todos existentes', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) expect(existsSync(`public/${icon.src}`)).toBe(true);
  });

  it('no usa marcas ajenas', () => {
    expect(JSON.stringify(manifest).toLowerCase()).not.toMatch(/vochlea|dubler/);
  });
});
