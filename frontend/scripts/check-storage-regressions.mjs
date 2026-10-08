// Calls the actual provider's storage loader, with no browser or DOM.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-storage-'));
try {
  const output = join(temporary, 'loader.mjs');
  await build({
    stdin: { resolveDir: frontend, contents: "export { loadInitialState } from './src/hooks/useBuildState.jsx';" },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    plugins: [{ name: 'expose-private-loader-for-test', setup(builder) {
      builder.onLoad({ filter: /hooks\/useBuildState\.jsx$/ }, async ({ path }) => {
        const contents = process.argv.includes('--baseline')
          ? execFileSync('git', ['show', 'HEAD:frontend/src/hooks/useBuildState.jsx'], { cwd: frontend, encoding: 'utf8' })
          : await readFile(path, 'utf8');
        return { contents: contents.replace('function loadInitialState()', 'export function loadInitialState()'), loader: 'jsx' };
      });
    }}]
  });
  const { loadInitialState } = await import(pathToFileURL(output).href);
  globalThis.localStorage = { getItem: () => JSON.stringify({ budget: null, game: null, selectedComponents: { cpuId: 'cpu-legacy' } }) };
  let restored = loadInitialState();
  assert.equal(restored.budget.amount, ''); assert.equal(restored.game.qualityPreset, 'high'); assert.equal(restored.selectedComponents.cpu.id, 'cpu-legacy');
  globalThis.localStorage = { getItem: () => JSON.stringify({ budget: { amount: 4500 }, game: { gameId: 'legacy-game' } }) };
  restored = loadInitialState(); assert.equal(restored.budget.currency, 'BRL'); assert.equal(restored.game.targetResolution, '1080p');
  globalThis.localStorage = { getItem: () => { throw new Error('denied'); } };
  restored = loadInitialState(); assert.equal(restored.budget.amount, '');
  console.log('PASS: actual BuildProvider storage loader survives null settings, merges partial legacy fields and tolerates denied storage');
} finally { delete globalThis.localStorage; await rm(temporary, { recursive: true, force: true }); }
