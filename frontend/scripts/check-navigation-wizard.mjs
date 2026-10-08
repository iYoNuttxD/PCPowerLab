// Source-level React rendering and isolated handlers. No browser or server.
// Run: node frontend/scripts/check-navigation-wizard.mjs
import { build } from 'esbuild';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-navigation-'));
const output = join(temporary, 'checks.mjs');
const realReact = require.resolve('react');
const realRouter = require.resolve('react-router-dom');
try {
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { default as React } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { MemoryRouter } from 'react-router-dom';
      export { default as AppLayout } from './src/components/layout/AppLayout.jsx';
      export { default as Select } from './src/components/ui/Select.jsx';
      export { default as WizardNavigation } from './src/components/build/WizardNavigation.jsx';
      export { default as CoolingPanel } from './src/components/build/CoolingPanel.jsx';
      export { default as SharedBuild } from './src/pages/SharedBuild.jsx';
      export { default as Admin } from './src/pages/Admin.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1') },
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-navigation-fixtures', setup(builder) {
      if (process.argv.includes('--drop-select-disclosure')) builder.onLoad({ filter: /ui\/Select\.jsx$/ }, async ({ path }) => ({
        contents: (await readFile(path, 'utf8')).replace("const shownValue = revealSelectedValue && fullValue === selectedLabel ? fullValue : '';", "const shownValue = '';"),
        loader: 'jsx'
      }));
      if (process.argv.includes('--drop-resize-focus-memory')) builder.onLoad({ filter: /layout\/AppLayout\.jsx$/ }, async ({ path }) => ({
        contents: (await readFile(path, 'utf8')).replace('document.activeElement === document.body ? headerFocus : document.activeElement', 'document.activeElement'),
        loader: 'jsx'
      }));
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'fixture' }));
      builder.onResolve({ filter: /\/services\/sharingService\.js$/ }, () => ({ path: 'sharing', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ resolveDir: frontend, loader: 'js', contents: path === 'react'
        ? `import * as Real from ${JSON.stringify(realReact)}; export * from ${JSON.stringify(realReact)}; export default Real.default; ${['useState', 'useRef', 'useEffect', 'useId'].map(name => `export const ${name} = (...args) => globalThis.__navHooks ? globalThis.__navHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}`
        : path === 'router' ? `export * from ${JSON.stringify(realRouter)}; export const useLocation = () => globalThis.__navFixtures.location; export const useParams = () => globalThis.__navFixtures.params;`
          : 'export const sharingService = { get: id => globalThis.__navFixtures.getShared(id) };' }));
    }}]
  });
  const { React, renderToStaticMarkup, MemoryRouter, AppLayout, Select, WizardNavigation, CoolingPanel, SharedBuild, Admin } = await import(pathToFileURL(output).href);
  const fixtures = globalThis.__navFixtures = { location: { pathname: '/components', key: 'first' }, params: { shareId: 'a' } };
  const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '';
  function all(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(item => all(item, predicate));
    return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  }
  const find = (tree, predicate) => { const result = all(tree, predicate)[0]; assert(result, 'Expected element missing'); return result; };
  const named = (tree, name) => all(tree, node => node.type?.name === name);
  const button = (tree, label) => find(tree, node => (node.type === 'button' || node.type?.name === 'Button') && text(node).trim() === label);
  const deferred = () => { let resolve; let reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
  const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  function runtime(Component, props = () => ({}), attach = () => {}) {
    const slots = []; let index = 0; let effects = [];
    const unchanged = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
    const hooks = {
      useState(initial) { const i = index++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
      useRef(initial) { const i = index++; slots[i] ??= { current: initial }; return slots[i]; },
      useId() { const i = index++; slots[i] ??= { id: `field-${i}` }; return slots[i].id; },
      useEffect(callback, deps) { const i = index++; if (!unchanged(slots[i]?.deps, deps)) { const previous = slots[i]; slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); }); } }
    };
    return {
      render() { index = 0; effects = []; globalThis.__navHooks = hooks; let tree; try { tree = Component(props()); } finally { delete globalThis.__navHooks; } attach(tree); effects.forEach(effect => effect()); return tree; },
      close() { slots.forEach(slot => slot?.cleanup?.()); }
    };
  }

  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AppLayout, null, React.createElement('h1', null, 'Page'))));
  for (const href of ['/build', '/components', '/ready-builds', '/insights', '/summary', '/saved-builds', '/performance-lab', '/compare', '/upgrades', '/feedback', '/about']) assert(markup.includes(`href="${href}"`));
  assert(!markup.includes('href="/admin"'));
  assert(markup.includes('Pular para o conteúdo'));
  assert.equal((markup.match(/class="nav-group"/g) || []).length, 3);
  console.log('PASS: rendered navigation preserves grouped destinations, skip link and hidden administrative entry');

  const focusCalls = []; const listeners = new Map(); let mediaChange;
  const body = { name: 'body' };
  function moveFocus(target) {
    const previous = globalThis.document.activeElement;
    globalThis.document.activeElement = target;
    if (previous !== body) listeners.get('focusout')?.({ target: previous, relatedTarget: target === body ? null : target });
    if (target !== body) listeners.get('focusin')?.({ target });
  }
  const focused = name => ({ name, focus() { focusCalls.push(name); moveFocus(this); } });
  const heading = { ...focused('heading'), setAttribute(name, value) { assert.equal(name, 'tabindex'); assert.equal(value, '-1'); } };
  const menu = focused('menu'); const brand = focused('brand'); const toggle = focused('toggle');
  const link = { ...focused('link'), closest: () => ({ querySelector: () => toggle }) };
  const navigation = { contains: target => [link, toggle].includes(target) };
  const header = { contains: target => [link, toggle, menu, brand].includes(target), querySelector: selector => selector === '#main-navigation' ? navigation : selector === '.brand' ? brand : toggle };
  let scrollCalls = 0;
  globalThis.document = { body, activeElement: body, addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) };
  const media = { matches: false, addEventListener: (_, handler) => { mediaChange = handler; }, removeEventListener: () => { mediaChange = null; } };
  globalThis.window = { scrollTo: () => { scrollCalls += 1; }, matchMedia: () => media };
  function resize(compact, { loseFocusFirst = false, emitBlur = true } = {}) {
    media.matches = compact;
    if (loseFocusFirst) {
      if (emitBlur) moveFocus(body);
      else globalThis.document.activeElement = body;
    }
    mediaChange({ matches: compact });
  }
  const nav = runtime(AppLayout, () => ({ children: 'page' }), tree => {
    find(tree, node => node.type === 'header').props.ref.current = header;
    find(tree, node => node.props?.className === 'mobile-menu-button').props.ref.current = menu;
    find(tree, node => node.type === 'main').props.ref.current = { querySelector: () => heading };
  });
  let tree = nav.render();
  button(tree, 'Explorar').props.onClick(); tree = nav.render();
  assert.equal(button(tree, 'Explorar').props['aria-expanded'], true);
  fixtures.location = { pathname: '/components', key: 'same-route-new-entry' }; nav.render(); tree = nav.render();
  assert.equal(button(tree, 'Explorar').props['aria-expanded'], false);
  assert.equal(focusCalls.at(-1), 'heading'); assert.equal(scrollCalls, 1);
  button(tree, 'Analisar').props.onClick(); tree = nav.render();
  find(tree, node => node.type === 'header').props.onKeyDown({ key: 'Escape' }); tree = nav.render();
  assert.equal(button(tree, 'Analisar').props['aria-expanded'], false); assert.equal(focusCalls.at(-1), 'toggle');
  button(tree, 'Explorar').props.onClick(); tree = nav.render();
  moveFocus(link); resize(true); tree = nav.render();
  assert.equal(focusCalls.at(-1), 'menu'); assert.equal(button(tree, 'Explorar').props['aria-expanded'], false);
  resize(false); assert.equal(focusCalls.at(-1), 'brand');
  for (const emitBlur of [true, false]) {
    button(tree, 'Explorar').props.onClick(); tree = nav.render();
    moveFocus(link); resize(true, { loseFocusFirst: true, emitBlur }); tree = nav.render();
    assert.equal(globalThis.document.activeElement, menu, 'CSS-hidden navigation must restore focus even when the browser resets activeElement before matchMedia change');
    assert.equal(button(tree, 'Explorar').props['aria-expanded'], false);
    resize(false, { loseFocusFirst: true, emitBlur }); tree = nav.render();
    assert.equal(globalThis.document.activeElement, brand, 'CSS-hidden compact menu must restore focus when desktop returns');
  }
  // An ordinary blur or an intentional move outside the header is not a resize
  // casualty. Keeping the last header target indefinitely would steal focus.
  moveFocus(link); moveFocus(body); resize(true); tree = nav.render();
  assert.equal(globalThis.document.activeElement, body, 'a blur before the breakpoint changes must not restore stale header focus');
  resize(false); moveFocus(link); moveFocus(heading); resize(true); tree = nav.render();
  assert.equal(globalThis.document.activeElement, heading, 'resize must leave a focused page heading alone');
  resize(false); moveFocus(link); moveFocus(heading); moveFocus(body); resize(true); tree = nav.render();
  assert.equal(globalThis.document.activeElement, body, 'a completed focus move outside the header must clear the remembered navigation target');
  // A compact dropdown stays visible until the handler closes it on desktop.
  moveFocus(link); resize(false); tree = nav.render();
  assert.equal(globalThis.document.activeElement, toggle);
  button(tree, 'Minhas builds').props.onClick(); nav.render();
  listeners.get('pointerdown')({ target: {} }); tree = nav.render();
  assert.equal(button(tree, 'Minhas builds').props['aria-expanded'], false);
  nav.close(); assert.equal(mediaChange, null); assert.equal(listeners.size, 0);
  console.log('PASS: isolated navigation handles both resize/blur orders without stealing outside focus; same-route, Escape/outside dismissal and listener cleanup work');

  let changedStep; let summaryCalled = false; let summaryFocused = false;
  tree = WizardNavigation({ currentStep: 'cpu', completedSteps: [], canAdvance: false, guidance: 'Selecione uma peça', onStepChange: step => { changedStep = step; }, onSummary: () => { summaryCalled = true; } });
  assert.equal(button(tree, 'Voltar').props.disabled, true); assert.equal(button(tree, 'Avançar').props.disabled, true);
  assert.equal(button(tree, 'Avançar').props['aria-describedby'], 'wizard-guidance');
  const details = { open: true, querySelector: () => ({ focus: () => { summaryFocused = true; } }) };
  find(tree, node => node.type === 'details').props.onKeyDown({ key: 'Escape', currentTarget: details, preventDefault() {} });
  assert.equal(details.open, false); assert(summaryFocused); assert.equal(changedStep, undefined);
  const stepButton = find(tree, node => node.type === 'button' && text(node).includes('Memória RAM'));
  details.open = true; stepButton.props.onClick({ currentTarget: { closest: () => details } });
  assert.equal(changedStep, 'ram'); assert.equal(details.open, false);
  tree = WizardNavigation({ currentStep: 'review', completedSteps: [], canAdvance: false, guidance: 'Faltam peças', onStepChange() {}, onSummary: () => { summaryCalled = true; } });
  button(tree, 'Ir para resumo').props.onClick(); assert(summaryCalled);
  assert.equal(all(tree, node => node.type?.name === 'Button' && text(node).includes('Avançar')).length, 0);
  console.log('PASS: wizard controls keep a single advance/summary path, explain blockers, and close step disclosure with Escape');

  const actionCalls = [];
  const cooler = { id: 'cooler-one', name: 'Cooler', category: 'cooler' }; const fan = { id: 'fan-one', name: 'Fan', category: 'fan', quantity: 1 };
  const cooling = () => CoolingPanel({ build: { selectedComponents: { cooler, fans: [fan] }, actions: Object.fromEntries(['setFans', 'selectComponent', 'removeComponent'].map(name => [name, (...args) => actionCalls.push([name, ...args])])) }, byType: { cooler: [cooler], fan: [fan, { ...fan, id: 'fan-two' }] }, onChange: () => actionCalls.push(['clear']) });
  const exercise = callback => { actionCalls.length = 0; callback(cooling()); assert.equal(actionCalls[0][0], 'clear'); assert.equal(actionCalls.length, 2); };
  exercise(tree => find(tree, node => node.props?.label === 'Cooler do processador').props.onChange({ target: { value: 'cooler-one' } }));
  exercise(tree => button(tree, 'Remover cooler').props.onClick());
  exercise(tree => find(tree, node => node.props?.label === 'Modelo de ventoinha 1').props.onChange({ target: { value: 'fan-two' } }));
  exercise(tree => find(tree, node => node.props?.label === 'Pacotes de ventoinhas 1').props.onChange({ target: { value: '2' } }));
  exercise(tree => button(tree, 'Remover ventoinhas 1').props.onClick());
  exercise(tree => find(tree, node => node.props?.label === 'Adicionar ventoinhas').props.onChange({ target: { value: 'fan-two' } }));
  console.log('PASS: each cooler/fan edit clears the old wizard message before changing the configuration');

  const requests = [];
  fixtures.getShared = id => { const request = { id, ...deferred() }; requests.push(request); return request.promise; };
  const shared = runtime(SharedBuild); tree = shared.render();
  assert.equal(text(find(tree, node => node.type === 'h1')), 'Configuração compartilhada');
  fixtures.params = { shareId: 'b' }; tree = shared.render();
  assert.equal(named(tree, 'LoadingSpinner').length, 1);
  requests[1].resolve({ name: 'Build B', buildSummary: { totalEstimatedPrice: 1234 } }); await tick(); tree = shared.render();
  assert.equal(text(find(tree, node => node.type === 'h1')), 'Build B'); assert(text(tree).includes('Total estimado de referência'));
  requests[0].resolve({ name: 'Obsolete A' }); await tick(); tree = shared.render();
  assert.equal(text(find(tree, node => node.type === 'h1')), 'Build B');
  fixtures.params = { shareId: 'c' }; tree = shared.render();
  assert.equal(text(find(tree, node => node.type === 'h1')), 'Configuração compartilhada');
  assert.equal(named(tree, 'LoadingSpinner').length, 1, 'a changed ID must not render old data before its effect runs');
  requests[2].reject(new Error('Unavailable')); await tick(); tree = shared.render();
  assert.equal(named(tree, 'ErrorState')[0].props.message, 'Unavailable'); assert.equal(all(tree, node => node.type === 'h1').length, 1);
  named(tree, 'ErrorState')[0].props.onRetry(); shared.render(); tree = shared.render();
  assert.equal(named(tree, 'ErrorState').length, 0); assert.equal(named(tree, 'LoadingSpinner').length, 1);
  assert.equal(requests[3].id, 'c'); requests[3].resolve({ name: 'Recovered C' }); await tick(); tree = shared.render();
  assert.equal(text(find(tree, node => node.type === 'h1')), 'Recovered C');
  shared.close();
  const adminMarkup = renderToStaticMarkup(React.createElement(Admin));
  assert(adminMarkup.includes('<h1>Área Administrativa</h1>')); assert(adminMarkup.includes('role="status"'));
  console.log('PASS: shared route rejects obsolete responses, resets by ID, keeps h1 in pending/error states and retries; admin also has a pending-state h1');
  const longName = 'Minha configuração para edição de vídeo e desenvolvimento de jogos';
  let selectedValue = 'long';
  let resizeSelect;
  let disconnected = 0;
  const selectElement = { clientWidth: 240, selectedOptions: [{ textContent: longName }] };
  globalThis.getComputedStyle = () => ({ fontStyle: 'normal', fontWeight: '700', fontSize: '16px', fontFamily: 'system-ui', paddingLeft: '16px', paddingRight: '16px' });
  globalThis.document.createElement = () => ({ getContext: () => ({ font: '', measureText: text => ({ width: text === longName ? 520 : 80 }) }) });
  globalThis.ResizeObserver = class {
    constructor(callback) { resizeSelect = callback; }
    observe(target) { assert.equal(target, selectElement); }
    disconnect() { disconnected += 1; }
  };
  const selectProps = () => ({ label: 'Build salva', value: selectedValue, revealSelectedValue: true, 'aria-describedby': 'existing-help', options: [{ value: 'long', label: longName }, { value: 'short', label: 'Build atual' }] });
  const selection = runtime(Select, selectProps, tree => { find(tree, node => node.type === 'select').props.ref.current = selectElement; });
  selection.render(); tree = selection.render();
  assert.equal(all(tree, node => node.props?.className === 'field-selected-value').length, 1, 'A clipped selected name must have a visible complete value');
  assert.equal(text(find(tree, node => node.props?.className === 'field-selected-value')), longName);
  assert(find(tree, node => node.type === 'select').props['aria-describedby'].includes('existing-help'));
  assert(find(tree, node => node.type === 'select').props['aria-describedby'].includes('-full-value'));
  assert.equal(text(find(tree, node => node.type === 'option' && node.props.value === 'long')), longName);
  selectElement.clientWidth = 700; resizeSelect(); tree = selection.render();
  assert.equal(all(tree, node => node.props?.className === 'field-selected-value').length, 0);
  assert.equal(find(tree, node => node.type === 'select').props['aria-describedby'], 'existing-help');
  selectElement.clientWidth = 240; resizeSelect(); selection.render();
  selectedValue = 'short'; selectElement.selectedOptions = [{ textContent: 'Build atual' }];
  selection.render(); tree = selection.render();
  assert.equal(all(tree, node => node.props?.className === 'field-selected-value').length, 0);
  selection.close(); assert.equal(disconnected, 2);
  delete globalThis.ResizeObserver; delete globalThis.getComputedStyle;
  console.log('PASS: opt-in select disclosure preserves the exact name, appears only for clipped text, follows resize/selection, keeps descriptions and cleans up');
  console.log('LIMITATION: isolated handlers/SSR do not validate real DOM events, keyboard focus, history, layout, contrast, scrolling, screenshots, or browser persistence');
} finally {
  delete globalThis.__navHooks; delete globalThis.__navFixtures;
  await rm(temporary, { recursive: true, force: true });
}
