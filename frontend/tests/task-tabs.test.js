import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Actual component functions and SSR only. The keyboard event's DOM methods are
// controlled doubles; browser focus/layout must be verified separately by E2E.
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await mkdtemp(join(tmpdir(), 'pcpowerlab-task-tabs-'));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, 'tabs.mjs');
await build({
  stdin: { resolveDir: frontend, loader: 'jsx', contents: `export { default as TaskTabs, TaskPanel } from './src/components/ui/TaskTabs.jsx'; export { renderToStaticMarkup } from 'react-dom/server';` },
  bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', outfile: output,
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  plugins: process.env.TASK_TABS_MUTATION === 'drop-keyboard' ? [{ name: 'negative-control', setup(builder) {
    builder.onLoad({ filter: /TaskTabs\.jsx$/ }, async ({ path }) => ({ loader: 'jsx', contents: (await readFile(path, 'utf8')).replace('onKeyDown={navigate}', 'onKeyDown={() => {}}') }));
  } }] : []
});
const { TaskTabs, TaskPanel, renderToStaticMarkup } = await import(pathToFileURL(output).href);
const tabs = [{ id: 'single', label: 'Um jogo' }, { id: 'compare', label: 'Comparar jogos' }, { id: 'software', label: 'Software' }];
function fixture(value = 'single') {
  const changes = [];
  const tree = TaskTabs({ id: 'tasks', label: 'Tipo de simulação', tabs, value, onChange: next => changes.push(next) });
  const buttons = tree.props.children;
  return { tree, buttons, changes };
}

test('TaskTabs uses one selected keyboard stop and matching panel relationships for every active task', () => {
  for (const value of tabs.map(tab => tab.id)) {
    const { tree, buttons, changes } = fixture(value);
    assert.equal(tree.props.role, 'tablist');
    assert.equal(tree.props['aria-label'], 'Tipo de simulação');
    assert.deepEqual(changes, [], 'Rendering alone must not change task or request work');
    assert.equal(buttons.filter(button => button.props.tabIndex === 0).length, 1);
    for (const [index, tab] of tabs.entries()) {
      const props = buttons[index].props;
      assert.equal(props.type, 'button'); assert.equal(props.role, 'tab');
      assert.equal(props['aria-selected'], value === tab.id);
      assert.equal(props.tabIndex, value === tab.id ? 0 : -1);
      const panel = TaskPanel({ id: 'tasks', value: tab.id, active: value === tab.id, children: value === tab.id ? 'Active controls' : null });
      assert.equal(panel.props.role, 'tabpanel'); assert.equal(panel.props.hidden, value !== tab.id);
      assert.equal(props['aria-controls'], panel.props.id);
      assert.equal(panel.props['aria-labelledby'], props.id);
      const html = renderToStaticMarkup(panel);
      assert.equal(html.includes('hidden=""'), value !== tab.id);
      assert.equal(html.includes('Active controls'), value === tab.id);
      buttons[index].props.onClick(); assert.equal(changes.at(-1), tab.id);
    }
  }
});

test('TaskTabs keyboard handlers wrap arrows and support Home/End with one activation and focus call', () => {
  for (const [index, key, expected] of [[0, 'ArrowLeft', 2], [2, 'ArrowRight', 0], [0, 'ArrowRight', 1], [2, 'ArrowLeft', 1], [1, 'Home', 0], [0, 'End', 2]]) {
    const { buttons, changes } = fixture(tabs[index].id);
    let prevented = 0; const focused = [];
    const elements = tabs.map((_tab, i) => ({ focus: () => focused.push(i) }));
    const parentElement = { querySelectorAll: selector => { assert.equal(selector, '[role="tab"]'); return elements; } };
    elements.forEach(element => { element.parentElement = parentElement; });
    buttons[index].props.onKeyDown({ key, currentTarget: elements[index], preventDefault: () => { prevented++; } });
    assert.equal(prevented, 1); assert.deepEqual(changes, [tabs[expected].id]); assert.deepEqual(focused, [expected]);
  }
});

test('TaskTabs leaves unrelated keys to native button and page behavior', () => {
  for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'Escape']) {
    const { buttons, changes } = fixture();
    buttons[0].props.onKeyDown({ key, get currentTarget() { throw new Error('Unrelated key must not inspect tab DOM'); }, preventDefault() { throw new Error('Unrelated key must not be cancelled'); } });
    assert.deepEqual(changes, []);
  }
});
