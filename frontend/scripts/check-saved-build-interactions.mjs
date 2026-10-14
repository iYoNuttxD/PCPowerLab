// Actual SavedBuilds handlers + React/router SSR, with controlled service promises.
// No browser hit-testing, focus/scroll behavior, real HTTP, or layout is claimed.
// Negative controls: --baseline=HEAD [--scenario=versions]
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const baseline = process.argv.find(arg => arg.startsWith('--baseline='))?.slice('--baseline='.length);
const versionsOnly = process.argv.includes('--scenario=versions');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-saved-edit-'));
const originalFormData = globalThis.FormData;
try {
  const output = join(temporary, 'checks.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `export { default as React } from 'react'; export { renderToStaticMarkup } from 'react-dom/server'; export { MemoryRouter } from 'react-router-dom'; export { default as SavedBuilds } from './src/pages/SavedBuilds.jsx'; export { default as Modal } from './src/components/ui/Modal.jsx';` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'saved-build-fixtures', setup(builder) {
      if (baseline) builder.onLoad({ filter: /pages\/SavedBuilds\.jsx$/ }, ({ path }) => ({ contents: execFileSync('git', ['show', `${baseline}:${path.slice(resolve(frontend, '..').length + 1)}`], { cwd: frontend, encoding: 'utf8' }), loader: 'jsx' }));
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/hooks\/use(BuildState|Components)\.(js|jsx)$/ }, args => ({ path: basename(args.path), namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/.*Service\.js$/ }, args => ({ path: basename(args.path, '.js'), namespace: 'service' }));
      builder.onLoad({ filter: /.*/, namespace: 'service' }, ({ path }) => ({ contents: `export const ${path} = new Proxy({}, {get: (_, method) => (...args) => globalThis.__savedQA.service(${JSON.stringify(path)}, method, args)});` }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => {
        let contents;
        if (path === 'react') contents = `import * as Real from ${JSON.stringify(require.resolve('react'))}; export * from ${JSON.stringify(require.resolve('react'))}; export default Real.default; ${['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect', 'useId'].map(name => `export const ${name} = (...args) => globalThis.__savedQAHooks ? globalThis.__savedQAHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`;
        else if (path === 'router') contents = `import * as Real from ${JSON.stringify(require.resolve('react-router-dom'))}; export * from ${JSON.stringify(require.resolve('react-router-dom'))}; export const useNavigate = () => globalThis.__savedQAHooks ? globalThis.__savedQA.navigate : Real.useNavigate();`;
        else if (path.startsWith('useBuildState')) contents = 'export const useBuildState = () => globalThis.__savedQA.build;';
        else contents = 'export const useComponents = () => globalThis.__savedQA.catalog; export const useCatalogComponent = component => ({component: globalThis.__savedQA.catalog.componentMap[typeof component === "string" ? component : component?.id], loading:false, error:""});';
        return { contents, resolveDir: frontend };
      });
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, SavedBuilds, Modal } = await import(pathToFileURL(output).href);
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const label = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(label).join('') : node?.props ? label(node.props.children) : '';
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const buttons = (tree, text) => named(tree, 'Button').filter(node => label(node).trim() === text);
  const button = (tree, text) => { const result = buttons(tree, text)[0]; assert(result, `Missing button: ${text}`); return result; };
  const form = tree => all(tree, node => node.type === 'form')[0];
  const removalDialog = tree => named(tree, 'Modal').find(node => node.props.title === 'Excluir build salva');
  const editDialog = tree => named(tree, 'Modal').find(node => node.props.title === 'Editar build salva');
  const render = tree => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/saved-builds'] }, tree));
  const tick = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
  const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
  function runtime() {
    const slots = []; let index = 0, effects = [];
    const same = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
      useMemo(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() }; return slots[i].value; },
      useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
      useEffect(callback, deps) { const i = index++; if (!same(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__savedQAHooks = hooks; let tree; try { tree = SavedBuilds(); } finally { delete globalThis.__savedQAHooks; } effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }
  const cpu = { id: 'cpu-current', name: 'AMD Ryzen 5 5600', category: 'cpu', price: 599 };
  const saved = [{ id: 'build-a', name: 'Meu PC', description: 'Antes', components: { cpuId: cpu.id } }, { id: 'build-b', name: 'Outro PC', components: {} }];
  const snapshot = { name: 'Versão guardada', description: 'Para estudar', components: { cpu: { id: cpu.id, name: 'Nome histórico do processador' }, gpuId: 'gpu-no-longer-known', coolerId: 'cooler-a', fans: [{ fanId: 'fan-a', quantity: 2 }] }, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'study', totalEstimatedPrice: 3499.9 };
  const version = { id: 'version-a', versionNumber: 3, reason: 'Snapshot criado pelo frontend em 01/01/2026.', createdAt: '2026-01-01T00:00:00Z', buildSnapshot: snapshot };
  let update = async () => ({});
  let fixture;
  function reset() {
    const components = [cpu, { id: 'cooler-a', name: 'Cooler independente' }, { id: 'fan-a', name: 'Ventoinhas de gabinete' }];
    fixture = { notifications: [], calls: [], routes: [], loads: [], build: { actions: { loadSavedBuild: (...args) => fixture.loads.push(args) } }, catalog: { components, componentMap: Object.fromEntries(components.map(item => [item.id, item])), loading: false, error: '' }, navigate: (...args) => fixture.routes.push(args), service(name, method, args) {
      if (name === 'savedBuildsService' && method === 'list') return Promise.resolve(saved);
      if (name === 'notificationsService' && method === 'list') return Promise.resolve(fixture.notifications);
      if (name === 'savedBuildVersionsService' && method === 'list') return Promise.resolve([version]);
      fixture.calls.push({ name, method, args });
      if (name === 'savedBuildsService' && method === 'update') return update(...args);
      return Promise.resolve({});
    } };
    globalThis.__savedQA = fixture;
  }
  globalThis.FormData = class { constructor(fields) { this.fields = fields; } get(name) { return this.fields[name]; } };
  const submit = (tree, name = 'Nome atualizado') => form(tree).props.onSubmit({ preventDefault() {}, currentTarget: { name, description: 'Descrição atualizada' } });
  reset();
  const page = runtime(); page.render(); await tick(); let tree = page.render();
  const componentDetails = all(tree, node => node.type === 'details' && node.props.className === 'saved-build-components');
  assert.equal(componentDetails.length, 2);
  assert(componentDetails.every(node => !node.props.open), 'Saved component galleries start closed');
  assert(componentDetails.every(node => named(node, 'Button').length === 0), 'Primary actions must remain outside collapsed galleries');
  assert(button(tree, 'Abrir montagem') && button(tree, 'Trocar peça') && button(tree, 'Nome e descrição'));
  const actionDetails = all(tree, node => node.type === 'details' && node.props.className === 'saved-build-actions');
  assert.equal(actionDetails.length, saved.length);
  for (const [index, disclosure] of actionDetails.entries()) {
    assert(!disclosure.props.open, 'Secondary actions start closed');
    assert.equal(all(disclosure, node => node.type === 'summary')[0].props['aria-label'], `Mais ações de ${saved[index].name}`);
    assert.deepEqual(named(disclosure, 'Button').map(node => label(node).trim()), [
      'Nome e descrição', 'Compartilhar', 'Ver versões', 'Criar versão', 'Histórico', 'Enviar feedback', 'Revalidar compatibilidade', 'Excluir'
    ], 'All eight secondary buttons remain available in the disclosure');
    assert.equal(all(disclosure, node => node.props?.to?.startsWith('/upgrades?buildId=')).length, 1, 'Upgrade is the ninth secondary action');
    for (const primary of ['Abrir montagem', 'Trocar peça']) assert.equal(buttons(disclosure, primary).length, 0);
  }
  let focusedSummary = false, prevented = false;
  const disclosureElement = { open: true, querySelector: selector => { assert.equal(selector, 'summary'); return { focus: () => { focusedSummary = true; } }; } };
  actionDetails[0].props.onKeyDown({ key: 'Escape', currentTarget: disclosureElement, preventDefault() { prevented = true; }, stopPropagation() {} });
  assert.equal(disclosureElement.open, false); assert(focusedSummary && prevented);
  console.log('PASS: every saved card retains 11 actions, with Open/Swap outside closed native secondary details and Escape returning to its summary');

  if (!versionsOnly) {
    button(tree, 'Nome e descrição').props.onClick(); tree = page.render();
    const pending = deferred(); update = () => pending.promise;
    const first = submit(tree); const duplicate = submit(tree);
    assert.equal(fixture.calls.length, 1, 'Two submits in one render must call update only once');
    tree = page.render(); assert(button(tree, 'Salvar alterações').props.disabled);
    pending.resolve({}); await first; await duplicate; tree = page.render();
    assert(form(tree), 'Save must retain the editor instead of collapsing the page beneath the pointer');
    assert(editDialog(tree)?.props.open, 'The native dialog must remain open after success');
    assert(button(tree, 'Salvar alterações').props.disabled, 'Unchanged successful form must not save again');
    await submit(tree); assert.equal(fixture.calls.length, 1);
    assert.deepEqual(fixture.routes, []); assert.deepEqual(fixture.loads, []);
    assert(render(tree).includes('Alterações salvas.'));
    console.log('PASS: same-render duplicate submit and post-success repeat save once, retain the native editor, and never navigate');

    form(tree).props.onChange(); tree = page.render(); assert(!button(tree, 'Salvar alterações').props.disabled);
    update = async () => { throw new Error('Sem conexão para salvar'); };
    await submit(tree, 'Segunda edição'); tree = page.render();
    assert(editDialog(tree).props.open); assert(render(tree).includes('Sem conexão para salvar'));
    assert(!button(tree, 'Salvar alterações').props.disabled);
    update = async () => ({}); await submit(tree, 'Segunda edição'); tree = page.render();
    assert.equal(fixture.calls.length, 3); assert(button(tree, 'Salvar alterações').props.disabled);
    editDialog(tree).props.onClose(); tree = page.render(); assert(!editDialog(tree).props.open);
    assert.deepEqual(fixture.routes, []);
    console.log('PASS: changed fields permit another save; errors remain visible in the editor, retry works, explicit close stays on saved builds');

    button(tree, 'Nome e descrição').props.onClick(); tree = page.render();
    assert(!button(tree, 'Salvar alterações').props.disabled);
    const late = deferred(); update = () => late.promise; const old = submit(tree);
    editDialog(tree).props.onClose(); tree = page.render();
    buttons(tree, 'Nome e descrição')[1].props.onClick(); tree = page.render();
    late.resolve({}); await old; tree = page.render();
    assert.equal(named(tree, 'Input').find(node => node.props.name === 'name').props.defaultValue, 'Outro PC');
    assert(!button(tree, 'Salvar alterações').props.disabled, 'A late old save cannot mark a newly opened editor as saved');
    button(tree, 'Cancelar').props.onClick(); tree = page.render();
    button(tree, 'Abrir montagem').props.onClick();
    assert.equal(fixture.loads[0][0], saved[0]); assert.deepEqual(fixture.routes, [['/build']]);
    assert(all(tree, node => node.props?.to === '/upgrades?buildId=build-a').length === 1);
    console.log('PASS: close/reopen rejects stale edit completion; loading saved configuration and encoded Upgrade destination remain intact');
  }

  button(tree, 'Ver versões').props.onClick(); await tick(); tree = page.render();
  const versions = named(tree, 'VersionsModal')[0];
  const versionMarkup = render(versions);
  assert(!versionMarkup.includes('Snapshot criado pelo frontend'), 'Legacy implementation jargon must have a readable label');
  assert(versionMarkup.includes('Ver configuração'));
  versions.props.onShowSnapshot(version); tree = page.render();
  const detail = named(tree, 'Modal').find(node => node.props.open && node.props.title.includes('versão'));
  const detailMarkup = render(detail);
  const humanMarkup = detailMarkup.split('<details')[0];
  for (const expected of ['Nome histórico do processador', 'Peça registrada, mas não encontrada', 'Cooler independente', 'Ventoinhas de gabinete', '2 pacotes', 'Estudos', 'Custo-benefício', '5.000,00', '3.499,90']) assert(humanMarkup.includes(expected), expected);
  assert(!humanMarkup.includes('gpu-no-longer-known')); assert(!humanMarkup.includes('cpu-current'));
  assert(detailMarkup.includes('<details>'), 'Raw snapshot belongs inside closed optional details');
  assert(detailMarkup.includes('gpu-no-longer-known'), 'Raw technical data must still preserve the original snapshot');
  assert.equal(snapshot.components.cpu.name, 'Nome histórico do processador');
  detail.props.onClose(); tree = page.render(); assert(named(tree, 'VersionsModal')[0].props.state.open);
  button(tree, 'Criar versão').props.onClick(); await tick();
  const creation = fixture.calls.find(call => call.name === 'savedBuildVersionsService' && call.method === 'create');
  assert(creation); assert(!creation.args[1].reason.includes('frontend')); assert.deepEqual(creation.args[1].buildSnapshot.components, saved[0].components);
  console.log('PASS: readable historical names, missing-piece fallback, cooler/fan quantities, budget/use settings, and closed raw-data details preserve the exact snapshot');
  if (!baseline) {
    const css = await readFile(join(frontend, 'src/styles/global.css'), 'utf8');
    assert(named(tree, 'Card').filter(node => node.props.className === 'saved-build-card').length === saved.length);
    assert(css.includes('.saved-build-card .build-parts-list li'), 'Saved cards require a scoped width-safe parts layout');
    console.log('PASS: saved cards opt into narrowly scoped component-row layout; viewport rendering remains unverified');
  }
  page.close();
  if (!baseline) {
    reset();
    const removalPage = runtime(); removalPage.render(); await tick(); let removalTree = removalPage.render();
    button(removalTree, 'Excluir').props.onClick(); removalTree = removalPage.render();
    assert(removalDialog(removalTree).props.open);
    assert(label(removalDialog(removalTree)).includes(saved[0].name), 'Confirmation identifies the exact saved build');
    assert.equal(fixture.calls.length, 0, 'Opening confirmation must not delete');
    assert.equal(removalDialog(removalTree).props.initialFocusSelector, '[data-dialog-initial-focus]', 'The dialog explicitly selects its safe initial focus target');
    assert.equal(button(removalDialog(removalTree), 'Cancelar').props['data-dialog-initial-focus'], true, 'Cancel carries the initial focus marker');
    assert.deepEqual(named(removalDialog(removalTree), 'Button').map(node => label(node).trim()), ['Cancelar', 'Confirmar exclusão']);
    button(removalDialog(removalTree), 'Cancelar').props.onClick(); removalTree = removalPage.render();
    assert(!removalDialog(removalTree).props.open); assert.equal(fixture.calls.length, 0);
    button(removalTree, 'Excluir').props.onClick(); removalTree = removalPage.render();
    removalDialog(removalTree).props.onClose(); removalTree = removalPage.render();
    assert.equal(fixture.calls.length, 0, 'Escape/backdrop close must not delete');
    const service = fixture.service;
    const pendingDelete = deferred();
    fixture.service = (name, method, args) => name === 'savedBuildsService' && method === 'remove'
      ? (fixture.calls.push({ name, method, args }), pendingDelete.promise) : service(name, method, args);
    button(removalTree, 'Excluir').props.onClick(); removalTree = removalPage.render();
    const firstDelete = button(removalTree, 'Confirmar exclusão').props.onClick();
    const repeatDelete = button(removalTree, 'Confirmar exclusão').props.onClick();
    assert.equal(fixture.calls.length, 1); assert.deepEqual(fixture.calls[0].args, [saved[0].id]);
    removalTree = removalPage.render(); assert(button(removalTree, 'Confirmar exclusão').props.disabled);
    pendingDelete.reject(new Error('Não foi possível excluir')); await firstDelete; await repeatDelete; removalTree = removalPage.render();
    assert(removalDialog(removalTree).props.open); assert(render(removalDialog(removalTree)).includes('Não foi possível excluir'));
    fixture.service = service;
    await button(removalTree, 'Confirmar exclusão').props.onClick(); removalTree = removalPage.render();
    assert(!removalDialog(removalTree).props.open); assert.equal(fixture.calls.length, 2);
    removalPage.close();
    console.log('PASS: named delete confirmation is non-mutating until confirmed; cancel/Escape, duplicate confirmation, failure and retry are covered');

    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    try {
      for (const scenario of ['cancel', 'missing-target', 'default', 'closed']) {
        const events = [];
        const selector = scenario === 'default' ? undefined : '[data-dialog-initial-focus]';
        const opener = { isConnected: true, focus: options => { assert.deepEqual(options, { preventScroll: true }); events.push('restore-opener'); } };
        const documentFixture = { activeElement: opener, body: { style: { overflow: 'auto' } } };
        const cancel = { focus: options => {
          assert(dialog.open, 'Initial focus must occur after the native dialog opens');
          assert.deepEqual(options, { preventScroll: true });
          documentFixture.activeElement = cancel;
          events.push('focus-cancel');
        } };
        const dialog = {
          open: false,
          showModal() { this.open = true; events.push('show-modal'); },
          querySelector(actual) { assert.equal(actual, selector); events.push('find-target'); return scenario === 'cancel' ? cancel : null; },
          close() { this.open = false; events.push('close-modal'); }
        };
        Object.defineProperty(globalThis, 'document', { configurable: true, value: documentFixture });
        let effect;
        globalThis.__savedQAHooks = {
          useRef: () => ({ current: dialog }),
          useId: () => 'focus-regression-title',
          useEffect(callback, dependencies) {
            assert.deepEqual(dependencies, [scenario !== 'closed', selector ?? null]);
            effect = callback;
          }
        };
        try { Modal({ open: scenario !== 'closed', title: 'Excluir build salva', initialFocusSelector: selector, onClose() {} }); }
        finally { delete globalThis.__savedQAHooks; }
        const cleanup = effect();
        if (scenario === 'closed') {
          assert.equal(cleanup, undefined); assert.deepEqual(events, []);
          assert.equal(documentFixture.body.style.overflow, 'auto');
          continue;
        }
        assert.deepEqual(events, scenario === 'cancel' ? ['show-modal', 'find-target', 'focus-cancel'] : scenario === 'missing-target' ? ['show-modal', 'find-target'] : ['show-modal']);
        if (scenario === 'cancel') assert.equal(documentFixture.activeElement, cancel);
        assert.equal(documentFixture.body.style.overflow, 'hidden');
        cleanup();
        assert.equal(dialog.open, false); assert.equal(documentFixture.body.style.overflow, 'auto');
        assert.deepEqual(events.slice(-2), ['close-modal', 'restore-opener']);
      }
    } finally {
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
      else delete globalThis.document;
      delete globalThis.__savedQAHooks;
    }
    console.log('PASS: actual Modal effect opens before focusing Cancel, tolerates absent/default targets, and restores scrolling and opener on close');

    reset();
    fixture.notifications = [{ id: 'notice-a', buildId: saved[0].id, message: 'Atenção: fonte incompatível', severity: 'high', read: false }];
    const noticePage = runtime(); noticePage.render(); await tick(); const noticeTree = noticePage.render();
    const monitoring = named(noticeTree, 'Card').find(node => node.props.className === 'saved-build-monitoring');
    assert(monitoring); assert.equal(all(monitoring, node => node.type === 'details').length, 0, 'Compatibility notifications must not be collapsed');
    assert(render(monitoring).includes('Atenção: fonte incompatível'));
    assert(render(monitoring).includes('Marcar como lida')); assert(button(monitoring, 'Revalidar todas'));
    noticePage.close();
    console.log('PASS: actionable saved-build compatibility notices remain expanded beside revalidation');
  }
  console.log('LIMITATION: hook/handler and SSR contracts only; pointer retargeting, native dialog focus, 390/768/1440 layouts, and browser navigation history require actual UI QA');
} finally {
  globalThis.FormData = originalFormData;
  delete globalThis.__savedQA; delete globalThis.__savedQAHooks;
  await rm(temporary, { recursive: true, force: true });
}
