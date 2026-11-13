// Regenera los WAV de test/fixtures: npm run fixtures
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES, encodeWav } from './signals.ts';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'wav');
mkdirSync(dir, { recursive: true });
for (const [name, make] of Object.entries(FIXTURES)) {
  writeFileSync(join(dir, name), encodeWav(make()));
}
console.log(`fixtures escritas en ${dir}`);
