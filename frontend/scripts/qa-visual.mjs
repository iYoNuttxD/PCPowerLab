import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = resolve(root, process.env.PCPOWERLAB_QA_OUTPUT || 'frontend/audit-test-results');
if (!process.env.PCPOWERLAB_AXE_PATH) throw new Error('Informe PCPOWERLAB_AXE_PATH com o caminho local de axe.min.js.');
const axeSource = await readFile(process.env.PCPOWERLAB_AXE_PATH, 'utf8');
await mkdir(out, { recursive: true });
// The child binds an ephemeral port and reports it over IPC. Never attach to a
// developer's existing server: this audit creates temporary builds and shares.
const server = spawn(process.execPath, ['--input-type=module', '-e', `
  import { app } from './src/app.js';
  const server = app.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
`], { cwd: root, env: { ...process.env, NODE_ENV: 'production', API_PREFIX: '/api/v1', ADMIN_PASSWORD: randomUUID() }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
const address = new Promise((resolve, reject) => {
  server.once('message', ({ port }) => resolve(`http://127.0.0.1:${port}`));
  server.once('error', reject);
  server.once('exit', code => reject(new Error(`O backend de auditoria encerrou antes de iniciar: ${code}`)));
});
let base;
let browser;
const checks = [], errors = [];
async function api(path, body) {
  const response = await fetch(`${base}/api/v1${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  assert.ok(response.ok, `${path}: ${response.status}`);
  const result = await response.json();
  return result.data ?? result;
}
let axeVersion;async function audit(page, name, width, screenshot = false) {
  await page.locator('.loading-state').first().waitFor({ state: 'hidden' });
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  await page.evaluate(axeSource);
  const a11y = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    const compact = rule => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) });
    return { version: window.axe.version, violations: result.violations.map(compact), incomplete: result.incomplete.map(compact) };
  });
  axeVersion = a11y.version;
  checks.push({ name, ...dimensions, ...a11y });
  if (screenshot) await page.screenshot({ path: `${out}/audit-${width}-${name}.png`, fullPage: true });
}
try {
  base = await address;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true });
  const catalog = await api('/components');
  const ready = (await api('/ready-builds'))[0];
  const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  const selectedComponents = Object.fromEntries(types.map(type => [type, catalog.find(part => part.id === ready.components[`${type}Id`])]));
  const payload = { build: ready.components, budget: { amount: 5500, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming', gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' };
  const summary = await api('/build-summary', payload);
  const saved = await api('/saved-builds', { name: 'QA configuração temporária', components: ready.components, budget: payload.budget, usageType: 'gaming' });
  const share = await api('/share/build', { buildId: saved.id });
  for (const [width, height] of [[1440,900], [1024,768], [768,1024], [390,844], [320,740]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.addInitScript(state => {
      if (!localStorage.getItem('pcpowerlab-build-state')) localStorage.setItem('pcpowerlab-build-state', JSON.stringify(state));
    }, { selectedComponents, wizardStep: 'review', budget: payload.budget, usageType: 'gaming', game: { gameId: payload.gameId, targetResolution: payload.targetResolution, qualityPreset: payload.qualityPreset }, summary, compatibility: summary.compatibility, alerts: summary.compatibility, bottlenecks: { status: 'success', data: summary.bottlenecks }, gamePerformance: summary.gamePerformance });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({ width, message: error.message }));
    for (const [path, name] of [['/', 'home'], ['/components', 'catalog'], ['/build', 'wizard'], ['/summary', 'summary'], ['/ready-builds', 'ready'], ['/saved-builds', 'saved'], ['/compare', 'compare'], ['/insights', 'insights'], ['/upgrades', 'upgrades'], ['/feedback', 'feedback'], ['/about', 'about'], [`/shared/${share.shareId}`, 'shared'], ['/admin', 'admin'], ['/feedback/new', 'feedback-new'], ['/missing-route-v25', 'not-found']]) {
      await page.goto(`${base}${path}`);
      await page.locator('main h1').waitFor();
      await page.locator('.loading-state').first().waitFor({ state: 'hidden' });
      if (name === 'compare') {
        await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
        await page.getByRole('button', { name: 'Comparar selecionadas', exact: true }).click();
        await page.getByRole('heading', { name: 'Resultado', exact: true }).waitFor();
      }
      if (name === 'upgrades') {
        await page.getByRole('button', { name: 'Gerar sugestões', exact: true }).click();
        await page.locator('.upgrade-card').first().waitFor();
      }
      if (name === 'summary') {
        await page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click();
        await page.getByText('Nota geral da build calculada.', { exact: true }).waitFor();
      }
      await audit(page, name, width, true);
      if (name === 'catalog') {
        const cards = await page.locator('.component-card').evaluateAll(cards => cards.slice(0, 4).map(card => {
          const rect = card.getBoundingClientRect();
          return { height: rect.height, price: card.querySelector('.component-card-price').getBoundingClientRect().top - rect.top, buttons: card.querySelector('.button-row').getBoundingClientRect().top - rect.top };
        }));
        assert.ok(cards.every(card => ['height', 'price', 'buttons'].every(key => Math.abs(card[key] - cards[0][key]) < 1)), 'Card alignment');
      }
    }
    await page.goto(`${base}/performance-lab`);
    await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
    const single = page.getByRole('region', { name: 'Resultado da simulação individual' });
    await single.waitFor(); await single.scrollIntoViewIfNeeded();
    await audit(page, 'performance-single', width, true);
    await page.getByRole('radio', { name: /^Comparar jogos/ }).check();
    await page.getByRole('button', { name: 'Comparar jogos', exact: true }).click();
    const comparison = page.getByRole('region', { name: 'Resultado da comparação de jogos' });
    await comparison.waitFor(); await comparison.scrollIntoViewIfNeeded();
    await audit(page, 'performance-comparison', width, true);
    await page.goto(`${base}/`);
    const menu = page.getByRole('button', { name: 'Abrir menu', exact: true });
    if (await menu.isVisible()) await menu.click();
    await page.locator('#nav-toggle-explore').click();
    await audit(page, 'menu', width, true);
    await page.keyboard.press('Escape');
    assert.ok(await page.locator('#nav-toggle-explore').evaluate(button => document.activeElement === button));
    await context.close();
  }
  await writeFile(`${out}/visual-a11y.json`, JSON.stringify({ browser: await browser.version(), axe: axeVersion, realApi: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, violations: checks.filter(check => check.violations.length).map(check => ({ name: check.name, width: check.width, rules: check.violations.map(rule => rule.id) })), overflows: checks.filter(check => check.scrollWidth > check.width), errors }));
  assert.equal(errors.length, 0);
  assert.ok(checks.every(check => check.violations.length === 0), 'Accessibility violations; inspect visual-a11y.json');
  assert.ok(checks.every(check => check.scrollWidth <= check.width));
} finally {
  await browser?.close(); server.kill();
}
