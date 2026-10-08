import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { readyBuilds } from '../../../src/data/readyBuilds.js';

// Browser execution is deliberately separate from collection. `--list` is not a pass.
const storageKey = 'pcpowerlab-build-state';
const byId = id => components.find(component => component.id === id);
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const original = Object.fromEntries(types.map(type => [type, byId(readyBuilds[0].components[`${type}Id`])]));
original.cooler = byId('cooler-noctua-nh-l9a-am4');
original.fans = [{ ...byId('fan-noctua-nf-p12-redux-1700-pwm'), quantity: 2 }];
const errors = new WeakMap();
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const getState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
const select = (page, label, value) => page.getByRole('combobox', { name: label, exact: true }).selectOption(value);
const cardNames = page => page.locator('.component-card h3').allTextContents();

async function expectCards(page, expected) {
  await expect(page.locator('.component-card')).toHaveCount(expected.length);
  expect((await cardNames(page)).sort()).toEqual(expected.map(component => component.name).sort());
}

async function seed(page) {
  await page.addInitScript(({ key, selectedComponents }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      selectedComponents, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' },
      usageType: 'gaming', wizardStep: 'review',
      game: { gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' },
      summary: { summary: 'Análise anterior ao catálogo' }, compatibility: { compatible: true, alerts: [] },
      alerts: [], bottlenecks: { hasBottleneck: false }, recommendation: { components: selectedComponents },
      gamePerformance: { estimatedFps: 75 }
    }));
  }, { key: storageKey, selectedComponents: original });
}

async function compare(page, entries) {
  for (const component of entries) await page.getByRole('button', { name: `Comparar: ${component.name}`, exact: true }).click();
  await page.getByRole('button', { name: `Comparar peças (${entries.length})`, exact: true }).click();
  return page.getByRole('dialog', { name: 'Comparar componentes', exact: true });
}

const comparisonRow = (dialog, label) => dialog.getByRole('row').filter({ has: dialog.getByRole('rowheader', { name: new RegExp(`^${label}`) }) });

test.beforeEach(async ({ page }) => {
  const captured = [];
  errors.set(page, captured);
  page.on('pageerror', error => captured.push(error.message));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/performance/games') return ok(route, []);
    return route.fulfill({ status: 500, json: { success: false, message: `Endpoint inesperado: ${path}` } });
  });
});

test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('v2.3 combina CPU AMD AM4 até R$ 1000 e limpa filtros técnicos ao trocar categoria', async ({ page }) => {
  await page.goto('/components');
  await select(page, 'Categoria', 'cpu');
  await select(page, 'Marca', 'AMD');
  await select(page, 'Socket', 'AM4');
  await page.getByRole('spinbutton', { name: 'Preço máximo estimado (R$)', exact: true }).fill('1000');
  await expectCards(page, components.filter(component => component.category === 'cpu' && component.brand === 'AMD' && component.specs.socket === 'AM4' && component.price <= 1000));
  await select(page, 'Marca', 'all');
  await select(page, 'Categoria', 'ram');
  await expect(page.getByRole('combobox', { name: 'Socket', exact: true })).toHaveCount(0);
  await expectCards(page, components.filter(component => component.category === 'ram' && component.price <= 1000));
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await expectCards(page, components);
  await expect(page.getByRole('combobox', { name: 'Categoria', exact: true })).toHaveValue('all');
  await expect(page.getByRole('spinbutton', { name: 'Preço máximo estimado (R$)', exact: true })).toHaveValue('');
});

for (const scenario of [
  { category: 'ram', filters: [['Tipo de memória', 'DDR4'], ['Capacidade', '16']], matches: spec => spec.memoryType === 'DDR4' && spec.capacityGb === 16 },
  { category: 'storage', filters: [['Interface', 'M.2 NVMe'], ['Capacidade', '1000']], matches: spec => spec.interface === 'M.2 NVMe' && spec.capacityGb === 1000 },
  { category: 'cooler', filters: [['Tipo de refrigeração', 'aio'], ['Sockets suportados', 'AM4'], ['Tamanho do radiador', '240']], matches: spec => spec.coolingType === 'aio' && spec.supportedSockets.includes('AM4') && spec.radiatorSizeMm === 240 },
  { category: 'fan', filters: [['Diâmetro', '120'], ['Espessura', '25'], ['Conector', '4-pin PWM PST']], matches: spec => spec.diameterMm === 120 && spec.thicknessMm === 25 && spec.connector === '4-pin PWM PST' }
]) {
  test(`v2.3 combina filtros técnicos de ${scenario.category}`, async ({ page }) => {
    await page.goto('/components');
    await select(page, 'Categoria', scenario.category);
    for (const [label, value] of scenario.filters) await select(page, label, value);
    const expected = components.filter(component => component.category === scenario.category && scenario.matches(component.specs));
    expect(expected.length).toBeGreaterThan(0);
    await expectCards(page, expected);
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expectCards(page, components);
  });
}

test('v2.3 ordena preço, desempenho e custo-benefício depois dos filtros, mantendo desconhecidos no fim', async ({ page }) => {
  const source = byId('cpu-ryzen-5-5500');
  const fixtures = [
    { ...source, id: 'cpu-a', name: 'CPU A', price: 400, performanceScore: 80 },
    { ...source, id: 'cpu-b', name: 'CPU B', price: 200, performanceScore: 60 },
    { ...source, id: 'cpu-c', name: 'CPU C', price: 600, performanceScore: 90 },
    { ...source, id: 'cpu-unknown', name: 'CPU D sem estimativa', price: 300, performanceScore: null },
    { ...source, id: 'cpu-excluded', name: 'CPU Z fora do filtro', price: 1500, performanceScore: 100 }
  ];
  await page.route('**/api/v1/components', route => ok(route, fixtures));
  await page.goto('/components');
  await select(page, 'Categoria', 'cpu');
  await select(page, 'Socket', 'AM4');
  await page.getByRole('spinbutton', { name: 'Preço máximo estimado (R$)', exact: true }).fill('1000');
  for (const [order, indices] of [
    ['price-asc', [1, 3, 0, 2]], ['price-desc', [2, 0, 3, 1]],
    ['performance-desc', [2, 0, 1, 3]], ['performance-asc', [1, 0, 2, 3]],
    ['value-desc', [1, 0, 2, 3]], ['name-desc', [3, 2, 1, 0]]
  ]) {
    await select(page, 'Ordenar por', order);
    await expect(page.locator('.component-card h3')).toHaveText(indices.map(index => fixtures[index].name));
  }
  await page.getByRole('spinbutton', { name: 'Desempenho mínimo estimado', exact: true }).fill('70');
  await page.getByRole('spinbutton', { name: 'Desempenho máximo estimado', exact: true }).fill('85');
  await expectCards(page, [fixtures[0]]);
});

test('v2.3 destaca diferenças sem transformar dados desconhecidos em zero e bloqueia comparação entre categorias', async ({ page }) => {
  const source = byId('cpu-ryzen-5-5500');
  const cpus = [
    { ...source, id: 'cpu-known', name: 'CPU com núcleos informados', performanceScore: 70 },
    { ...source, id: 'cpu-unknown', name: 'CPU sem núcleos informados', price: null, performanceScore: null, specs: { ...source.specs, cores: null } }
  ];
  await page.route('**/api/v1/components', route => ok(route, [...cpus, original.ram]));
  await page.goto('/components');
  await page.getByRole('button', { name: `Comparar: ${cpus[0].name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Comparar: ${original.ram.name}`, exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Comparar peças (1)', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: `Comparar: ${cpus[1].name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Comparar peças (2)', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Comparar componentes', exact: true });
  const coreRow = comparisonRow(dialog, 'Núcleos');
  await expect(coreRow).toHaveClass(/comparison-difference/);
  await expect(coreRow).toContainText('Diferença');
  await expect(coreRow.getByRole('cell', { name: 'Não informado', exact: true })).toHaveCount(1);
  await expect(coreRow.getByRole('cell', { name: '0', exact: true })).toHaveCount(0);
  await expect(comparisonRow(dialog, 'Socket')).not.toHaveClass(/comparison-difference/);
  await expect(comparisonRow(dialog, 'Preço estimado')).toContainText('Preço indisponível');
  await dialog.getByRole('button', { name: `Remover ${cpus[1].name} da comparação`, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Comparar peças (1)', exact: true })).toBeDisabled();
});

test('v2.3 adicionar do catálogo preserva demais peças e preferências, invalida análises e persiste ao recarregar', async ({ page }) => {
  await seed(page);
  await page.goto('/components');
  const before = await getState(page);
  const replacement = components.find(component => component.category === 'ram' && component.id !== original.ram.id);
  await select(page, 'Categoria', 'ram');
  await page.getByRole('button', { name: `Selecionar: ${replacement.name}`, exact: true }).click();
  await expect.poll(async () => (await getState(page)).selectedComponents.ram.id).toBe(replacement.id);
  const state = await getState(page);
  expect(state.selectedComponents).toEqual({ ...before.selectedComponents, ram: replacement });
  for (const key of ['budget', 'usageType', 'game', 'wizardStep']) expect(state[key]).toEqual(before[key]);
  for (const key of ['summary', 'compatibility', 'alerts', 'bottlenecks', 'recommendation', 'gamePerformance']) expect(state[key]).toBeNull();
  await expect(page.getByRole('button', { name: `Selecionado: ${replacement.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect.poll(async () => (await getState(page)).selectedComponents).toEqual(state.selectedComponents);
  await expect(page.getByRole('button', { name: `Selecionado: ${replacement.name}`, exact: true })).toBeVisible();
});

test('v2.3 tabela de comparação mantém rolagem horizontal dentro do modal no celular', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Verificação de geometria exclusiva do viewport móvel.');
  await page.goto('/components');
  await select(page, 'Categoria', 'cpu');
  const dialog = await compare(page, components.filter(component => component.category === 'cpu').slice(0, 4));
  const region = dialog.getByRole('region', { name: 'Tabela de comparação de peças', exact: true });
  await expect(region).toBeVisible();
  const geometry = await region.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const modal = element.closest('dialog');
    return { client: element.clientWidth, scroll: element.scrollWidth, left: rect.left, right: rect.right,
      viewport: window.innerWidth, documentWidth: document.documentElement.scrollWidth,
      modalWidth: modal.clientWidth, modalScroll: modal.scrollWidth, overflow: getComputedStyle(element).overflowX };
  });
  expect(geometry.scroll).toBeGreaterThan(geometry.client);
  expect(['auto', 'scroll']).toContain(geometry.overflow);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.modalScroll).toBeLessThanOrEqual(geometry.modalWidth + 1);
  await region.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
});

test('v2.3 compatibilidade usa a montagem atual e diferencia compatível, conflito e verificação incompleta', async ({ page }) => {
  await seed(page);
  const candidates = components.filter(component => component.category === 'cpu').slice(0, 3);
  const statuses = ['compatible', 'incompatible', 'unverified'];
  let requestBody;
  let requestCount = 0;
  await page.route('**/api/v1/components', route => ok(route, candidates));
  await page.route('**/api/v1/components/compatibility', route => {
    requestCount++;
    requestBody = route.request().postDataJSON();
    return ok(route, candidates.map((component, index) => ({
      componentId: component.id, status: statuses[index],
      alerts: index === 1 ? [{ severity: 'high', message: 'Socket incompatível no teste.' }] : [],
      unverifiedChecks: index === 2 ? [{ code: 'SOCKET_UNKNOWN', message: 'Socket da placa-mãe não informado.' }] : []
    })));
  });
  await page.goto('/components');
  await select(page, 'Categoria', 'cpu');
  await expectCards(page, candidates);
  expect(requestCount).toBe(0);
  for (let index = 0; index < statuses.length; index++) {
    await select(page, 'Compatibilidade com a montagem', statuses[index]);
    await expectCards(page, [candidates[index]]);
  }
  expect(requestBody.components).toEqual({
    ...readyBuilds[0].components,
    coolerId: original.cooler.id,
    fans: [{ fanId: original.fans[0].id, quantity: 2 }]
  });
  await select(page, 'Compatibilidade com a montagem', 'all');
  await expectCards(page, candidates);
});

test('v2.3 adicionar fan pela comparação mantém quantidades existentes e não duplica pacotes selecionados', async ({ page }) => {
  await seed(page);
  await page.goto('/components');
  await select(page, 'Categoria', 'fan');
  const existing = byId(original.fans[0].id);
  const added = byId('fan-arctic-p12-pwm-pst-5-pack');
  const dialog = await compare(page, [existing, added]);
  await expect(dialog.getByRole('button', { name: `Selecionado: ${existing.name}`, exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: `Selecionar: ${added.name}`, exact: true }).click();
  await expect(dialog.getByRole('button', { name: `Selecionado: ${added.name}`, exact: true })).toBeDisabled();
  await expect.poll(async () => (await getState(page)).selectedComponents.fans.length).toBe(2);
  const state = await getState(page);
  expect(state.selectedComponents).toEqual({ ...original, fans: [...original.fans, { ...added, quantity: 1 }] });
  expect(state.summary).toBeNull();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: `Selecionado: ${added.name}`, exact: true }).click();
  expect((await getState(page)).selectedComponents).toEqual(state.selectedComponents);
  await page.reload();
  await expect.poll(async () => (await getState(page)).selectedComponents).toEqual(state.selectedComponents);
});

test('v2.3 faixa de desempenho inválida tem orientação e muda de categoria sem filtros invisíveis', async ({ page }) => {
  await page.goto('/components');
  await select(page, 'Categoria', 'cpu');
  await page.getByRole('spinbutton', { name: 'Desempenho mínimo estimado', exact: true }).fill('80');
  await page.getByRole('spinbutton', { name: 'Desempenho máximo estimado', exact: true }).fill('20');
  await expect(page.getByText('O índice mínimo deve ser menor ou igual ao máximo.', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Desempenho máximo estimado', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Nenhum componente encontrado', { exact: true })).toHaveCount(0);
  await select(page, 'Categoria', 'fan');
  await expect(page.getByRole('spinbutton', { name: 'Desempenho mínimo estimado', exact: true })).toHaveCount(0);
  await expectCards(page, components.filter(component => component.category === 'fan'));
  await select(page, 'Categoria', 'cpu');
  await expect(page.getByRole('spinbutton', { name: 'Desempenho mínimo estimado', exact: true })).toHaveValue('');
  await expect(page.getByRole('spinbutton', { name: 'Desempenho máximo estimado', exact: true })).toHaveValue('');
});

test('v2.3 falha de compatibilidade permite tentar novamente e resposta antiga não filtra outra montagem', async ({ page }) => {
  await seed(page);
  const candidates = components.filter(component => component.category === 'ram').slice(0, 2);
  await page.route('**/api/v1/components', route => ok(route, candidates));
  let attempts = 0;
  let releaseOld;
  let oldReplyFinished = false;
  await page.route('**/api/v1/components/compatibility', async route => {
    attempts++;
    if (attempts === 1) return route.fulfill({ status: 503, json: { success: false, message: 'Verificação temporariamente indisponível.' } });
    if (attempts === 2) {
      await new Promise(resolve => { releaseOld = resolve; });
      await ok(route, candidates.map(component => ({ componentId: component.id, status: 'compatible', alerts: [], unverifiedChecks: [] })));
      oldReplyFinished = true;
      return;
    }
    return ok(route, candidates.map((component, index) => ({ componentId: component.id, status: index ? 'unverified' : 'compatible', alerts: [], unverifiedChecks: [] })));
  });
  await page.goto('/components');
  await select(page, 'Categoria', 'ram');
  await select(page, 'Compatibilidade com a montagem', 'compatible');
  await expect(page.getByRole('alert')).toContainText('Verificação temporariamente indisponível.');
  await expect(page.locator('.component-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect.poll(() => Boolean(releaseOld)).toBe(true);
  await expect(page.getByText('Verificando candidatos com a montagem atual...', { exact: true })).toBeVisible();
  // Leave the in-flight filter, change the persisted build, and request fresh results.
  await select(page, 'Compatibilidade com a montagem', 'all');
  const replacement = candidates.find(component => component.id !== original.ram.id);
  await page.getByRole('button', { name: `Selecionar: ${replacement.name}`, exact: true }).click();
  await select(page, 'Compatibilidade com a montagem', 'compatible');
  await expectCards(page, [candidates[0]]);
  releaseOld();
  await expect.poll(() => oldReplyFinished).toBe(true);
  // Wait for the old response handler to have a chance to settle, without a timing-only sleep.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expectCards(page, [candidates[0]]);
  expect((await getState(page)).selectedComponents.ram.id).toBe(replacement.id);
});
