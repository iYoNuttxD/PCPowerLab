// Isolated source hook/handler checks, not browser E2E or React DOM integration.
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const baseline = process.argv.find(arg => arg.startsWith('--baseline='))?.split('=')[1];
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-async-'));
try {
  const output = join(temporary, 'checks.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `export { default as SavedBuilds } from './src/pages/SavedBuilds.jsx'; export { useApiRequest } from './src/hooks/useApiRequest.js';` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-handlers', setup(builder) {
      if (baseline) builder.onLoad({ filter: baseline === 'hook' ? /hooks\/useApiRequest\.js$/ : /pages\/SavedBuilds\.jsx$/ }, ({ path }) => ({
        contents: execFileSync('git', ['show', `HEAD:${path.slice(resolve(frontend, '..').length + 1)}`], { cwd: frontend, encoding: 'utf8' }),
        loader: 'jsx'
      }));
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `export const ${path} = new Proxy({}, { get: (_, method) => (...args) => globalThis.__qa.service(${JSON.stringify(path)}, method, args) });` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ resolveDir: frontend, contents: path === 'react'
        ? `export * from ${JSON.stringify(require.resolve('react'))}; ${['useState', 'useRef', 'useEffect', 'useCallback', 'useMemo'].map(name => `export const ${name} = (...args) => globalThis.__qaHooks.${name}(...args);`).join('\n')}`
        : path === 'router' ? 'export const Link = "a"; export const useNavigate = () => () => {};'
          : path.startsWith('useBuildState') ? 'export const useBuildState = () => ({ actions: {} });'
            : 'export const useComponents = () => ({ components: [], loading: false, error: "" }); export const useCatalogComponent = () => ({});' }));
    }}]
  });
  const { SavedBuilds, useApiRequest } = await import(pathToFileURL(output).href);
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  const tick = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  function runtime(component) {
    const slots = []; let index = 0, effects = [], writes = 0;
    const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
    const hooks = {
      useState(initial) { const i = index++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, value => { writes++; slots[i].value = typeof value === 'function' ? value(slots[i].value) : value; }]; },
      useRef(initial) { const i = index++; slots[i] ??= { current: initial }; return slots[i]; },
      useEffect(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = callback(); }); } },
      useMemo(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); }
    };
    return {
      render() { index = 0; effects = []; globalThis.__qaHooks = hooks; const result = component(); delete globalThis.__qaHooks; effects.forEach(callback => callback()); return result; },
      close() { slots.forEach(slot => slot?.cleanup?.()); },
      writes: () => writes
    };
  }
  if (baseline !== 'modals') {
  const hook = runtime(useApiRequest);
  let request = hook.render(); const pending = deferred(); let calls = 0;
  const first = request.run(() => { calls++; return pending.promise; });
  const second = request.run(() => { calls++; return 'duplicate'; });
  assert.notEqual(first, second); assert.equal(await second, undefined); await tick(); assert.equal(calls, 1);
  assert.equal(hook.render().loading, true);
  pending.resolve('saved'); assert.equal(await first, 'saved'); assert.equal(await second, undefined);
  request = hook.render(); assert.equal(request.loading, false);
  await request.run(() => { throw new Error('offline'); });
  request = hook.render(); assert.equal(request.error, 'offline'); assert.equal(request.loading, false);
  assert.equal(await request.run(() => 'retry'), 'retry'); assert.equal(hook.render().error, '');
  const afterUnmount = deferred(); const running = request.run(() => afterUnmount.promise); await tick(); hook.close();
  const beforeWrites = hook.writes(); afterUnmount.reject(new Error('late')); await running;
  assert.equal(hook.writes(), beforeWrites);
  console.log('PASS: useApiRequest synchronously prevents duplicate mutation, reports failure, retries, and skips own post-unmount writes');

  }
  const builds = [{ id: 'a', name: 'Build A' }, { id: 'b', name: 'Build B' }];
  const pendingReads = [];
  globalThis.__qa = { service(name, method, args) {
    if (name === 'savedBuildsService' && method === 'list') return Promise.resolve(builds);
    if (name === 'notificationsService' && method === 'list') return Promise.resolve([]);
    if (method === 'list') { const pending = deferred(); pendingReads.push({ name, args, ...pending }); return pending.promise; }
    return Promise.resolve({});
  } };
  const all = (node, test) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, test)) : [...(test(node) ? [node] : []), ...all(node.props?.children, test)];
  const label = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(label).join('') : node?.props ? label(node.props.children) : '';
  const modal = (tree, name) => all(tree, node => node.type?.name === name)[0];
  const buttons = (tree, text) => all(tree, node => node.type?.name === 'Button' && label(node).trim() === text);
  if (baseline !== 'modals') {
  const defaultService = globalThis.__qa.service;
  const shareRequest = deferred(); let shareCalls = 0;
  globalThis.__qa.service = (name, method, args) => name === 'sharingService' && method === 'create'
    ? (shareCalls++, shareRequest.promise) : defaultService(name, method, args);
  globalThis.window = { location: { origin: 'https://example.test' } };
  const mutationPage = runtime(SavedBuilds); mutationPage.render(); await tick(); let mutationTree = mutationPage.render();
  const shareButton = buttons(mutationTree, 'Compartilhar')[0];
  const shareOne = shareButton.props.onClick(); const shareTwo = shareButton.props.onClick();
  assert.equal(shareCalls, 1);
  mutationTree = mutationPage.render();
  for (const name of ['Compartilhar', 'Criar versão', 'Excluir']) {
    assert(buttons(mutationTree, name).every(button => button.props.disabled));
  }
  assert(buttons(mutationTree, 'Ver versões').every(button => !button.props.disabled));
  shareRequest.resolve({ shareId: 'share-one' }); await shareOne; await shareTwo;
  mutationTree = mutationPage.render(); assert(buttons(mutationTree, 'Compartilhar').every(button => !button.props.disabled));
  mutationPage.close(); globalThis.__qa.service = defaultService; delete globalThis.window;
  console.log('PASS: actual SavedBuilds duplicate share calls API once and disables competing mutation controls until completion');
  }
  for (const [name, buttonText] of [['VersionsModal', 'Ver versões'], ['HistoryModal', 'Histórico']]) {
    const page = runtime(SavedBuilds); page.render(); await tick(); let tree = page.render();
    buttons(tree, buttonText)[0].props.onClick(); const older = pendingReads.at(-1);
    buttons(tree, buttonText)[1].props.onClick(); const newer = pendingReads.at(-1);
    newer.resolve([{ id: 'new' }]); await tick(); older.resolve([{ id: 'old' }]); await tick();
    tree = page.render(); assert.equal(modal(tree, name).props.state.build.id, 'b');
    buttons(tree, buttonText)[0].props.onClick(); const closedRead = pendingReads.at(-1);
    tree = page.render(); modal(tree, name).props.onClose(); closedRead.reject(new Error('late close'));
    await tick(); tree = page.render(); assert.equal(modal(tree, name).props.state.open, false);
    assert.equal(all(tree, node => node.type?.name === 'ErrorState').length, 0);
    buttons(tree, buttonText)[0].props.onClick(); const unmountedRead = pendingReads.at(-1); page.close(); const writes = page.writes();
    unmountedRead.resolve([]); await tick(); assert.equal(page.writes(), writes);
    console.log(`PASS: ${name} keeps latest build, ignores closed-modal failure, and ignores unmounted response`);
  }
} finally { delete globalThis.__qa; delete globalThis.__qaHooks; delete globalThis.window; await rm(temporary, { recursive: true, force: true }); }
