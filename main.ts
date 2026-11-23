// Old Town — entry program for the make.fun GTA 6 bounty.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier with the kit's buildDossier library. Node 22 standard library only.
// Deterministic: the same repository always produces the same output bytes.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, caps);
writeFileSync(join(out, 'dossier.json'), dossier);
