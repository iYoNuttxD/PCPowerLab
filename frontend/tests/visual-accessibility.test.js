import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { color, composite, contrast, contrastAudit, declaration } from '../scripts/lib/visualContrast.mjs';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(frontend, 'package.json'));
let directory, ui;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pcpowerlab-accessibility-'));
  const output = join(directory, 'ui.mjs');
  await build({
    stdin: { resolveDir: frontend, loader: 'jsx', contents: `
      export { createElement } from 'react';
      export { renderToStaticMarkup } from 'react-dom/server';
      export { default as Input } from './src/components/ui/Input.jsx';
      export { default as Select } from './src/components/ui/Select.jsx';
      export { default as Modal } from './src/components/ui/Modal.jsx';
      export { default as Alert } from './src/components/ui/Alert.jsx';
      export { default as LoadingSpinner } from './src/components/ui/LoadingSpinner.jsx';
      export { TaskPanel } from './src/components/ui/TaskTabs.jsx';
    ` },
    bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    plugins: [{ name: 'isolated-effects', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ resolveDir: frontend, loader: 'js', contents: `
        import * as Real from ${JSON.stringify(require.resolve('react'))};
        export * from ${JSON.stringify(require.resolve('react'))};
        export default Real.default;
        ${['useRef', 'useEffect', 'useId'].map(name => `export const ${name} = (...args) => globalThis.__a11yHooks ? globalThis.__a11yHooks.${name}(...args) : Real.${name}(...args);`).join('\n')}
      ` }));
    } }]
  });
  ui = await import(pathToFileURL(output).href);
});
after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
const render = (Component, props) => ui.renderToStaticMarkup(ui.createElement(Component, props));

test('V3 text, large metrics, control borders and focus pass measurable contrast thresholds', t => {
  const checks = contrastAudit();
  assert.equal(checks.length, 64);
  for (const check of checks) assert(check.ratio >= check.minimum, `${check.name}: ${check.ratio.toFixed(3)} < ${check.minimum}`);
  const normal = checks.filter(check => check.criterion === '1.4.3 normal text');
  const controls = checks.filter(check => check.criterion === '1.4.11 control boundary');
  const focus = checks.filter(check => check.criterion.includes('focus indicator'));
  t.diagnostic(`Normal text minimum ${Math.min(...normal.map(check => check.ratio)).toFixed(2)}:1; control boundary minimum ${Math.min(...controls.map(check => check.ratio)).toFixed(2)}:1; focus minimum ${Math.min(...focus.map(check => check.ratio)).toFixed(2)}:1.`);
});

test('contrast audit models real alpha compositing and detects known failing substitutes', () => {
  assert.equal(contrast(color('#ffffff'), color('#000000')), 21);
  assert.equal(contrast(color('#ffffff'), color('#ffffff')), 1);
  assert.deepEqual(composite([255, 255, 255, .5], [0, 0, 0, 1]), [127.5, 127.5, 127.5, 1]);
  assert(contrast(color('var(--border)'), color('var(--panel-strong)')) < 3, 'Decorative border must not be substituted for a control boundary');
  assert(contrast(color('var(--text)'), color('var(--cyan)')) < 4.5, 'Primary buttons require dark text, not white');
  assert(contrast(color('var(--focus)'), color('var(--cyan)')) < 3, 'Focus ring must be offset onto its dark surrounding surface, not painted inside the cyan button');
});

test('scoped CSS preserves images, exposes whole product names and includes short-height/forced-color safeguards', async () => {
  const css = await readFile(join(frontend, 'src/styles/journey.css'), 'utf8');
  const main = await readFile(join(frontend, 'src/main.jsx'), 'utf8');
  assert(main.indexOf("import './styles/global.css'") < main.indexOf("import App from"), 'Baseline must load before App/page style imports');
  assert.equal(declaration('journey', ':is(.journey-wizard, .catalog-page) .component-card h3', 'overflow'), 'visible');
  assert.equal(declaration('journey', ':is(.journey-wizard, .catalog-page) .component-card .btn', 'white-space'), 'normal');
  assert.match(css, /@media \(max-height: 600px\)/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.doesNotMatch(css, /\.home[\w-]*\s*\{/);
  assert.doesNotMatch(css, /(?:\.component-image|\.component-media)[^{]*\{/);
});

test('Input retains hint, error, external description and native validation identity together', () => {
  const html = render(ui.Input, { id: 'budget', label: 'Orçamento', hint: 'Informe em reais.', error: 'Informe um valor maior que zero.', 'aria-describedby': 'budget-context', type: 'number' });
  assert.match(html, /<label for="budget">Orçamento<\/label>/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="budget-context budget-description"/);
  assert.match(html, /id="budget-description"/);
  assert.match(html, /Informe em reais/);
  assert.match(html, /class="field-error" aria-live="polite"/);
  assert.match(html, /Informe um valor maior que zero/);
  assert.match(render(ui.Input, { id: 'external', label: 'Campo', 'aria-invalid': true }), /aria-invalid="true"/);
});

test('Select has the same labelled hint/error contract without forwarding internal props to native DOM', () => {
  const html = render(ui.Select, { id: 'usage', label: 'Tipo de uso', hint: 'Escolha o uso principal.', error: 'Selecione uma opção.', options: [{ value: 'work', label: 'Trabalho' }], 'aria-describedby': 'usage-context' });
  assert.match(html, /<label for="usage">Tipo de uso<\/label>/);
  assert.match(html, /aria-describedby="usage-context usage-description"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Escolha o uso principal/);
  assert.match(html, /Selecione uma opção/);
  assert.doesNotMatch(html, /<select[^>]+(?: hint| error)=/);
});

test('status states include spoken text and severity semantics rather than only color', () => {
  for (const type of ['success', 'warning', 'error', 'info']) {
    const html = render(ui.Alert, { type, title: `${type} title`, children: 'Descrição e próximo passo.' });
    assert.match(html, new RegExp(`role="${type === 'error' ? 'alert' : 'status'}"`));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /Descrição e próximo passo/);
  }
  assert.match(render(ui.LoadingSpinner, { label: 'Calculando a montagem.' }), /role="status".*Calculando a montagem/s);
  const html = render(ui.TaskPanel, { id: 'summary', value: 'budget', active: true, children: 'Resumo do orçamento.' });
  assert.match(html, /aria-labelledby="summary-tab-budget" tabindex="0"/);
});

function modalFixture({ open = true, initialFocusSelector = null, connected = true } = {}) {
  const previousDocument = globalThis.document;
  const events = [], effects = [];
  const opener = { isConnected: connected, focus: () => events.push('restore-opener') };
  const initial = { focus: () => events.push('initial-focus') };
  const dialog = { showModal: () => events.push('show-modal'), close: () => events.push('close'), querySelector: () => initial };
  globalThis.document = { activeElement: opener, body: { style: { overflow: 'auto' } } };
  globalThis.__a11yHooks = { useRef: () => ({ current: dialog }), useId: () => 'dialog-title', useEffect: callback => effects.push(callback) };
  let tree;
  try { tree = ui.Modal({ open, title: 'Detalhes', onClose: () => events.push('on-close'), initialFocusSelector, children: 'Informações.' }); }
  finally { delete globalThis.__a11yHooks; }
  return { tree, events, effects, restore() { globalThis.document = previousDocument; } };
}

test('actual Modal effect opens before optional focus, restores scroll/focus and ignores a detached opener', () => {
  for (const connected of [true, false]) {
    const fixture = modalFixture({ initialFocusSelector: '[data-cancel]', connected });
    try {
      const cleanup = fixture.effects[0]();
      assert.deepEqual(fixture.events, ['show-modal', 'initial-focus']);
      assert.equal(document.body.style.overflow, 'hidden');
      cleanup();
      assert.equal(document.body.style.overflow, 'auto');
      assert.deepEqual(fixture.events, ['show-modal', 'initial-focus', 'close', ...(connected ? ['restore-opener'] : [])]);
    } finally { fixture.restore(); }
  }
});

test('actual Modal handlers include disclosures in focus wrap and retain native Escape dismissal', () => {
  const fixture = modalFixture();
  try {
    const { tree, events } = fixture;
    assert.equal(tree.type, 'dialog');
    assert.equal(tree.props['aria-labelledby'], 'dialog-title');
    assert.equal(tree.props.tabIndex, undefined, 'Native dialog must not receive a tabindex attribute');
    const controls = [0, 1, 2].map(index => ({ disabled: index === 1, tabIndex: 0, getClientRects: () => [1], focus: () => events.push(`focus-${index}`) }));
    const currentTarget = { querySelectorAll: selector => { assert(selector.includes('summary')); return controls; }, focus: () => events.push('focus-dialog') };
    const event = { key: 'Tab', currentTarget, preventDefault: () => events.push('prevent') };
    document.activeElement = controls[2]; tree.props.onKeyDown(event);
    assert.deepEqual(events.splice(0), ['prevent', 'focus-0']);
    document.activeElement = controls[0]; tree.props.onKeyDown({ ...event, shiftKey: true });
    assert.deepEqual(events.splice(0), ['prevent', 'focus-2']);
    tree.props.onCancel({ preventDefault: () => events.push('prevent-cancel') });
    assert.deepEqual(events.splice(0), ['prevent-cancel', 'on-close']);
    for (const control of controls) control.disabled = true;
    tree.props.onKeyDown(event);
    assert.deepEqual(events.splice(0), ['prevent', 'focus-dialog']);
  } finally { fixture.restore(); }
});

test('actual Modal backdrop handler ignores child/content clicks and closes only outside dialog bounds', () => {
  const fixture = modalFixture();
  try {
    const currentTarget = { getBoundingClientRect: () => ({ left: 10, right: 110, top: 10, bottom: 110 }) };
    fixture.tree.props.onClick({ currentTarget, target: {}, clientX: 0, clientY: 0 });
    fixture.tree.props.onClick({ currentTarget, target: currentTarget, clientX: 50, clientY: 50 });
    assert.deepEqual(fixture.events, []);
    fixture.tree.props.onClick({ currentTarget, target: currentTarget, clientX: 5, clientY: 50 });
    assert.deepEqual(fixture.events, ['on-close']);
  } finally { fixture.restore(); }
});
