import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-threejs.ts';

const root = new URL('.', import.meta.url).pathname;
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
mkdirSync(output, { recursive: true });
cpSync(resolve(root, 'game'), resolve(output, 'game'), { recursive: true, force: true });
cpSync(resolve(root, 'screenshots'), resolve(output, 'screenshots'), { recursive: true, force: true });
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(resolve(output, 'dossier.json'), dossier);
console.log(`EMBER YARD exported to ${output}`);
