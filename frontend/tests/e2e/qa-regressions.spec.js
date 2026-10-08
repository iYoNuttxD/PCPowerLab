import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';
import { games } from '../../../src/data/games.js';

const key = 'pcpowerlab-build-state';
const ids = readyBuilds[0].components;
const selection = Object.fromEntries(Object.entries(ids).map(([slot, id]) => [slot.replace(/Id$/, ''), components.find(part => part.id === id)]));
selection.fans = [];
const oldGame = { game: games[0].name, estimatedFps: 120, targetResolution: '1080p', qualityPreset: 'high' };
const summary = { compatibility: { compatible: true, alerts: [] }, bottlenecks: { hasBottleneck: false }, gamePerformance: oldGame, summary: 'Resumo da configuração anterior.' };
const failures = new WeakMap();
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const saved = { id: 'qa-saved', name: 'Configuração recuperável', components: ids, budget: { amount: 5000 }, usageType: 'gaming' };

async function seed(page, extra = {}) {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key, state: { selectedComponents: selection, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, ...extra } });
}
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
async function releaseResponse(page, release) {
  const done = page.waitForResponse(response => response.url().endsWith('/build-summary'));
  release();
  await (await done).finished();
  // Wait for the result's rendering turn, without a fixed sleep.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/performance/games') return ok(route, games);
    if (path === '/build-summary') return ok(route, summary);
    if (path === '/performance/simulate-game') return ok(route, oldGame);
    if (path === '/purchase-links/build') return ok(route, {});
    if (path === '/saved-builds') return ok(route, [saved]);
    if (path === '/notifications') return ok(route, []);
    if (path === '/ready-builds' || path === '/usage-profiles') return ok(route, []);
    return route.fulfill({ status: 500, json: { success: false, message: `Endpoint inesperado: ${path}` } });
  });
});
test.afterEach(async ({ page }) => { expect(failures.get(page)).toEqual([]); });

test('alterar resolução invalida o FPS e o texto do resumo, mantendo as peças e a compatibilidade', async ({ page }) => {
  await seed(page);
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('120 FPS', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Resolução', exact: true }).selectOption('4k');
  await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toHaveCount(0);
  const state = await stored(page);
  expect(state.gamePerformance).toBeNull();
  expect(state.summary).toBeNull();
  expect(state.selectedComponents).toEqual(selection);
  expect(state.compatibility.compatible).toBe(true);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Resolução', exact: true })).toHaveValue('4k');
  await expect(page.getByText('120 FPS', { exact: true })).toHaveCount(0);
});

test('resposta atrasada do resumo não restaura análises após editar uma peça em outra página', async ({ page }) => {
  let release;
  await seed(page);
  await page.route('**/build-summary', async route => {
    await new Promise(resolve => { release = resolve; });
    await ok(route, summary);
  });
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('link', { name: 'Voltar e editar', exact: true }).click();
  const replacement = components.find(part => part.category === 'cpu' && part.id !== selection.cpu.id);
  await page.getByRole('button', { name: `Selecionar: ${replacement.name}`, exact: true }).click();
  await releaseResponse(page, release);
  const state = await stored(page);
  expect(state.selectedComponents.cpu.id).toBe(replacement.id);
  expect(state.summary).toBeNull();
  expect(state.gamePerformance).toBeNull();
});

test('resposta atrasada do resumo não publica FPS dos parâmetros anteriores', async ({ page }) => {
  let release;
  await seed(page);
  await page.route('**/build-summary', async route => {
    await new Promise(resolve => { release = resolve; });
    await ok(route, summary);
  });
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('combobox', { name: 'Qualidade', exact: true }).selectOption('ultra');
  await releaseResponse(page, release);
  await expect(page.getByText('120 FPS', { exact: true })).toHaveCount(0);
  expect((await stored(page)).summary).toBeNull();
});

test('build salva aguarda o catálogo antes de abrir e recupera nomes, preços e orçamento', async ({ page }) => {
  let release;
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, async route => {
    await new Promise(resolve => { release = resolve; });
    await ok(route, components);
  });
  await page.goto('/saved-builds');
  const open = page.getByRole('button', { name: 'Abrir montagem', exact: true });
  await expect(open).toBeDisabled();
  await expect(page.getByText('Carregando dados das peças salvas...', { exact: true })).toBeVisible();
  release();
  await expect(open).toBeEnabled();
  await open.click();
  const state = await stored(page);
  expect(state.selectedComponents).toEqual(selection);
  expect(state.budget.amount).toBe(5000);
  await expect(page.locator('.wizard-selection')).toContainText(selection.cpu.name);
});

test('falha ao gerar resumo é recuperável e não cria rejeição de promessa sem tratamento', async ({ page }) => {
  await seed(page);
  await page.route('**/build-summary', route => route.fulfill({ status: 503, json: { success: false, message: 'Serviço temporariamente indisponível.' } }));
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Serviço temporariamente indisponível.', { exact: true })).toBeVisible();
  expect((await stored(page)).selectedComponents).toEqual(selection);
  await page.unroute('**/build-summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Resumo final atualizado.', { exact: true })).toBeVisible();
});

test('tentar novamente uma recomendação não aumenta o orçamento e repete a consulta', async ({ page }) => {
  const inputs = [];
  await page.route('**/recommendations/builds-by-budget-range', route => {
    inputs.push(route.request().postDataJSON());
    return inputs.length === 1
      ? route.fulfill({ status: 503, json: { success: false, message: 'Recomendação temporariamente indisponível.' } })
      : ok(route, [{ components: selection, totalEstimatedPrice: 4699.3 }]);
  });
  await page.goto('/ready-builds');
  await page.getByRole('spinbutton', { name: 'Orçamento mínimo', exact: true }).fill('4000');
  await page.getByRole('spinbutton', { name: 'Orçamento máximo', exact: true }).fill('5500');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await expect(page.getByText('Recomendação temporariamente indisponível.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Orçamento máximo', exact: true })).toHaveValue('5500');
  await expect(page.getByRole('button', { name: 'Usar recomendação inteira', exact: true })).toBeVisible();
  expect(inputs).toHaveLength(2);
  expect(inputs[1]).toEqual(inputs[0]);
});

test('comparação de builds invalida resultado e ignora resposta antiga ao alterar critérios', async ({ page }) => {
  let release;
  let attempts = 0;
  const result = { builds: [{ name: 'Build atual', totalEstimatedPrice: 4699.3, compatible: true, performanceScore: 75 }], recommendedBuild: { name: 'Build atual', reason: 'Resultado dos critérios enviados.' } };
  await seed(page);
  await page.route('**/build-comparison', async route => {
    if (++attempts === 2) await new Promise(resolve => { release = resolve; });
    await ok(route, result);
  });
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
  const compare = page.getByRole('button', { name: 'Comparar selecionadas', exact: true });
  await compare.click();
  const table = page.getByRole('region', { name: /^Comparação de configurações/ });
  await expect(table).toContainText('75');
  await page.getByRole('combobox', { name: 'Critério', exact: true }).selectOption('performance');
  await expect(table).toHaveCount(0);
  await compare.click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('spinbutton', { name: 'Orçamento de referência', exact: true }).fill('4000');
  const response = page.waitForResponse(response => response.url().endsWith('/build-comparison'));
  release();
  await (await response).finished();
  await expect(compare).toBeEnabled();
  await expect(table).toHaveCount(0);
  await compare.click();
  await expect(table).toContainText('75');
});

test('erro ao carregar peças salvas impede abrir com preços zerados e permite recuperar', async ({ page }) => {
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => route.fulfill({ status: 503, json: { success: false, message: 'Catálogo indisponível.' } }));
  await page.goto('/saved-builds');
  const open = page.getByRole('button', { name: 'Abrir montagem', exact: true });
  await expect(open).toBeDisabled();
  await expect(page.getByText(/Não foi possível carregar as peças salvas/)).toBeVisible();
  await page.unroute(/\/api\/v1\/components(?:\?.*)?$/);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(open).toBeEnabled();
  await open.click();
  expect((await stored(page)).selectedComponents).toEqual(selection);
});

async function alignedFormControls(page) {
  return page.locator('.field-row-grid').evaluateAll(grids => grids.length > 0 && grids.every(grid => {
    const rows = new Map();
    const heights = [];
    for (const field of grid.querySelectorAll(':scope > .field')) {
      const control = field.querySelector('input, select');
      if (!control) continue;
      const fieldBox = field.getBoundingClientRect();
      const box = control.getBoundingClientRect();
      if (box.width <= 0 || box.left < fieldBox.left - 1 || box.right > fieldBox.right + 1) return false;
      const key = Math.round(fieldBox.top);
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(box.top);
      heights.push(box.height);
    }
    return heights.length > 0 && Math.max(...heights) - Math.min(...heights) <= 1
      && [...rows.values()].every(tops => Math.max(...tops) - Math.min(...tops) <= 1);
  }));
}

test('erros de orçamento e etapas preservam o alinhamento e descrevem o campo inválido', async ({ page }) => {
  await seed(page);
  await page.goto('/upgrades');
  await page.getByRole('spinbutton', { name: 'Orçamento para upgrade', exact: true }).fill('0');
  await page.getByRole('spinbutton', { name: 'Orçamento total', exact: true }).fill('0');
  const steps = page.getByRole('spinbutton', { name: 'Número máximo de etapas', exact: true });
  await steps.fill('0');
  await expect(steps).toHaveAttribute('aria-invalid', 'true');
  await expect(steps).toHaveAccessibleDescription('Informe uma quantidade inteira de etapas entre 1 e 5.');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => alignedFormControls(page)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await steps.fill('3');
  await expect(steps).toHaveAttribute('aria-invalid', 'false');
  await expect(steps).not.toHaveAttribute('aria-describedby');
  await page.goto('/compare');
  await page.getByRole('spinbutton', { name: 'Orçamento de referência', exact: true }).fill('0');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => alignedFormControls(page)).toBe(true);
  }
});

test('pesos do perfil mantêm armazenamento legível e controles iguais em telas estreitas', async ({ page }) => {
  await page.goto('/ready-builds');
  const storage = page.locator('.weight-grid').getByRole('spinbutton', { name: 'Armazenamento', exact: true });
  await expect(storage).toBeVisible();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => alignedFormControls(page)).toBe(true);
    await expect.poll(() => storage.evaluate(input => {
      const label = input.closest('.field').querySelector('label');
      const range = document.createRange();
      range.selectNodeContents(label);
      return range.getClientRects().length;
    })).toBe(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('nomes selecionados permanecem completos sem abreviar builds nem jogos', async ({ page }) => {
  const name = 'Minha configuração para edição de vídeo e desenvolvimento de jogos';
  await seed(page);
  await page.route('**/api/v1/saved-builds', route => ok(route, [{ ...saved, name }]));
  await page.goto('/upgrades?buildId=qa-saved');
  const source = page.getByRole('combobox', { name: 'Build salva', exact: true });
  await expect(source).toHaveValue(saved.id);
  await page.setViewportSize({ width: 320, height: 900 });
  const fullName = source.locator('..').locator('.field-selected-value');
  await expect(fullName).toHaveText(name);
  await expect(fullName).toBeVisible();
  await expect(source).toHaveAccessibleDescription(name);
  await expect.poll(() => fullName.evaluate(node => node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight)).toBe(true);
  await source.selectOption('');
  await expect(fullName).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await source.selectOption(saved.id);
  await expect(source.locator('option:checked')).toHaveText(name);
  await expect(fullName).toHaveCount(0);
  const priority = page.locator('.upgrade-source-grid').getByRole('combobox', { name: 'Prioridade', exact: true });
  await priority.selectOption('lowest-price');
  await expect(priority.locator('option:checked')).toHaveText('Menor preço');

  await page.goto('/summary');
  await page.setViewportSize({ width: 768, height: 900 });
  const game = page.getByRole('combobox', { name: 'Selecione um jogo para simular o desempenho', exact: true });
  await game.selectOption('game-microsoft-flight-simulator');
  await expect(game.locator('option:checked')).toHaveText('Microsoft Flight Simulator');
  await expect.poll(() => game.evaluate(select => {
    const grid = select.closest('.summary-game-controls').getBoundingClientRect();
    return Math.abs(select.getBoundingClientRect().width - grid.width) <= 1;
  })).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
