import { currentBuild } from './helpers/catalog.js';
import { test, expect } from '@playwright/test';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { components } from '../../../src/data/components.mock.js';
import { DEFAULT_COOLING_CONDITIONS } from '../../src/utils/coolingSimulation.js';

const key = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const cooler = { id: 'test-cooler', category: 'cooler', name: 'Cooler de teste', brand: 'Marca de teste', price: 100, specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150, powerWatts: 3 } };
const replacementCooler = { ...cooler, id: 'test-cooler-replacement', name: 'Outro cooler de teste', price: 140 };
const fan = { id: 'test-fan', category: 'fan', name: 'Pacote de teste', brand: 'Marca de teste', price: 60, specs: { diameterMm: 120, connector: '4-pin PWM', unitsPerPack: 3, powerWatts: 2 } };
const secondFan = { ...fan, id: 'test-fan-second', name: 'Ventoinha individual de teste', price: 40, specs: { ...fan.specs, diameterMm: 140, unitsPerPack: 1 } };
const catalog = [...components, cooler, replacementCooler, fan, secondFan];
const core = currentBuild(components);
const conditions = { ...DEFAULT_COOLING_CONDITIONS, inletCelsius: 28, coolerSpeedFraction: 0.5, extraFanSpeedFraction: 1, referenceHeatWatts: 90 };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const productCard = (page, name) => page.locator('.cooling-panel .component-card').filter({ has: page.getByRole('heading', { name, exact: true }) });
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

async function seed(page, state = {}) {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key, state: { selectedComponents: core, wizardStep: 'cooling', budget: { amount: 5000 }, coolingConditions: conditions, ...state } });
}

async function category(page, name) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${name}(?: ·|$)`) });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function expectSelectionOnly(page) {
  const selection = page.locator('.cooling-panel');
  await expect(selection.locator('select')).toHaveCount(0);
  await expect(page.locator('.cooling-simulation, .cooling-temperature-chart, .cooling-noise-result, .cooling-simulation-controls, .cooling-simulation-method')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Ar na entrada do cooler (°C)', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Restaurar cenário', exact: true })).toHaveCount(0);
}

async function thermalTask(page) {
  await page.goto('/performance-lab');
  await category(page, 'Temperatura e ruído');
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, catalog);
    if (path === '/performance/games' || path === '/professional-software') return ok(route, []);
    if (path === '/purchase-links/build') return ok(route, {});
    if (path === '/build-summary') return ok(route, { components: core, compatibility: { compatible: true, alerts: [] }, summary: 'Old result' });
    return route.fulfill({ status: 503, json: { success: false, message: `Endpoint inesperado no teste: ${path}` } });
  });
});

test('cooling product cards replace and remove the cooler, persist packs, and invalidate analysis', async ({ page }) => {
  await seed(page, { wizardStep: 'review' });
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Old result', { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).compatibility?.compatible).toBe(true);
  await page.getByRole('link', { name: 'Voltar e editar', exact: true }).click();
  await expect(page.locator('.wizard-actions')).toContainText('Etapa 9 de 9');
  await page.getByRole('button', { name: 'Alterar refrigeração', exact: true }).click();
  await expect(page.locator('.wizard-actions')).toContainText('Opcional · Refrigeração');
  await expectSelectionOnly(page);
  await expect(productCard(page, cooler.name).locator('.component-media')).toHaveCount(1);
  await expect(productCard(page, cooler.name)).toContainText('150 mm');
  await expect(productCard(page, cooler.name)).toContainText('100,00');
  await page.getByRole('button', { name: `Selecionar: ${cooler.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Selecionado: ${cooler.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: `Selecionar: ${replacementCooler.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Selecionado: ${replacementCooler.name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: `Selecionar: ${cooler.name}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
  await category(page, 'Ventoinhas extras');
  await page.getByRole('button', { name: `Adicionar: ${fan.name}`, exact: true }).click();
  await page.getByRole('spinbutton', { name: `Pacotes: ${fan.name}`, exact: true }).fill('2');
  await expect(page.getByText('2 pacote(s) × 3 unidades = 6 ventoinhas', { exact: false })).toBeVisible();
  const saved = await stored(page);
  expect(saved.selectedComponents.fans[0].quantity).toBe(2);
  expect(saved.selectedComponents.cooler.id).toBe(replacementCooler.id);
  expect(saved.compatibility).toBeNull();
  expect(saved.summary).toBeNull();
  expect(saved.coolingConditions).toEqual(conditions);
  await page.reload();
  await category(page, 'Ventoinhas extras');
  await expect(page.getByRole('spinbutton', { name: `Pacotes: ${fan.name}`, exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: `Remover ventoinhas: ${fan.name}`, exact: true }).click();
  await category(page, 'Cooler do processador');
  await page.getByRole('button', { name: `Remover cooler: ${replacementCooler.name}`, exact: true }).click();
  const cleared = await stored(page);
  expect(cleared.selectedComponents.cooler).toBeUndefined();
  expect(cleared.selectedComponents.fans).toEqual([]);
  expect(cleared.coolingConditions).toEqual(conditions);
  for (const type of types) expect(cleared.selectedComponents[type]).toEqual(core[type]);
});

test('fan cards add distinct products once, expose pack arithmetic, and keep controls mounted between tabs', async ({ page }) => {
  await seed(page);
  await page.goto('/build');
  const coolerTab = page.getByRole('tab', { name: /^Cooler do processador(?: ·|$)/ });
  const fanTab = page.getByRole('tab', { name: /^Ventoinhas extras(?: ·|$)/ });
  const coolerPanel = page.locator(`[id="${await coolerTab.getAttribute('aria-controls')}"]`);
  const fanPanel = page.locator(`[id="${await fanTab.getAttribute('aria-controls')}"]`);
  await expect(coolerPanel).toBeVisible();
  await expect(fanPanel).toBeHidden();
  await expect(fanPanel.locator('.component-card')).not.toHaveCount(0);
  await coolerTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(fanTab).toBeFocused();
  await expect(fanTab).toHaveAttribute('aria-selected', 'true');
  await expect(coolerPanel).toBeHidden();
  await expect(coolerPanel.locator('.component-card')).not.toHaveCount(0);
  await expect(productCard(page, fan.name).locator('.component-media')).toHaveCount(1);
  await expect(productCard(page, fan.name)).toContainText('120 mm');
  await expect(productCard(page, fan.name)).toContainText('60,00');
  await page.getByRole('button', { name: `Adicionar: ${fan.name}`, exact: true }).click();
  const selected = page.getByRole('button', { name: `Adicionado: ${fan.name}`, exact: true });
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  const revisionBeforeRepeat = (await stored(page)).revision;
  await selected.dblclick();
  expect((await stored(page)).revision).toBe(revisionBeforeRepeat);
  expect((await stored(page)).selectedComponents.fans.map(item => ({ id: item.id, quantity: item.quantity }))).toEqual([{ id: fan.id, quantity: 1 }]);
  await page.getByRole('button', { name: `Adicionar: ${secondFan.name}`, exact: true }).click();
  const quantity = page.getByRole('spinbutton', { name: `Pacotes: ${fan.name}`, exact: true });
  await quantity.fill('2');
  for (const invalid of ['0', '21', '1.5']) {
    await quantity.fill(invalid);
    await expect(quantity).toHaveValue('2');
    expect((await stored(page)).selectedComponents.fans.find(item => item.id === fan.id).quantity).toBe(2);
  }
  await page.getByRole('spinbutton', { name: `Pacotes: ${secondFan.name}`, exact: true }).fill('3');
  await expect(fanPanel.getByText('2 pacote(s) × 3 unidades = 6 ventoinhas', { exact: false })).toBeVisible();
  await expect(fanPanel.getByText('3 pacote(s) × 1 unidades = 3 ventoinhas', { exact: false })).toBeVisible();
  await expect(fanPanel.getByText(/Subtotal.*120,00/)).toHaveCount(2);
  expect((await stored(page)).selectedComponents.fans.map(({ id, quantity }) => ({ id, quantity }))).toEqual([
    { id: fan.id, quantity: 2 }, { id: secondFan.id, quantity: 3 }
  ]);
  await quantity.evaluate(element => { element.dataset.mountProbe = 'preserved'; });
  await category(page, 'Cooler do processador');
  await expect(fanPanel).toBeHidden();
  await expect(fanPanel.locator(`[data-mount-probe="preserved"]`)).toHaveCount(1);
  await category(page, 'Ventoinhas extras');
  await expect(quantity).toHaveAttribute('data-mount-probe', 'preserved');
  await expect(quantity).toHaveValue('2');
  await expectSelectionOnly(page);
  await page.getByRole('button', { name: `Remover ventoinhas: ${fan.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: `Adicionar: ${fan.name}`, exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: `Pacotes: ${secondFan.name}`, exact: true })).toHaveValue('3');
  expect((await stored(page)).selectedComponents.fans.map(item => item.id)).toEqual([secondFan.id]);
  expect((await stored(page)).coolingConditions).toEqual(conditions);
  await page.reload();
  await category(page, 'Ventoinhas extras');
  await expect(page.getByRole('spinbutton', { name: `Pacotes: ${secondFan.name}`, exact: true })).toHaveValue('3');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

for (const status of ['missing', 'legacy']) {
  test(`saved ${status} cooling remains visible and removable without silently selecting a replacement`, async ({ page }) => {
    const previousCooler = { ...cooler, id: `old-${status}-cooler`, name: `Cooler salvo ${status}`, catalogStatus: 'legacy', selectable: false };
    const previousFan = { ...fan, id: `old-${status}-fan`, name: `Ventoinhas salvas ${status}`, catalogStatus: 'legacy', selectable: false, quantity: 2 };
    const unusedLegacy = { ...previousCooler, id: `unused-${status}-cooler`, name: `Cooler histórico não selecionado ${status}` };
    await page.route('**/api/v1/components**', route => ok(route, [...catalog, unusedLegacy, ...(status === 'legacy' ? [previousCooler, previousFan] : [])]));
    await seed(page, { selectedComponents: { ...core, cooler: previousCooler, fans: [previousFan] } });
    await page.goto('/build');
    await expect(page.getByRole('button', { name: `Selecionar: ${cooler.name}`, exact: true })).toBeVisible();
    await expect(productCard(page, previousCooler.name)).toBeVisible();
    await expect(productCard(page, previousCooler.name)).toHaveClass(/is-selected/);
    await expect(productCard(page, unusedLegacy.name)).toHaveCount(0);
    await expect(page.getByRole('button', { name: `Remover cooler: ${previousCooler.name}`, exact: true })).toBeVisible();
    await category(page, 'Ventoinhas extras');
    await expect(productCard(page, previousFan.name)).toBeVisible();
    await expect(productCard(page, previousFan.name)).toHaveClass(/is-selected/);
    await expect(page.getByRole('spinbutton', { name: `Pacotes: ${previousFan.name}`, exact: true })).toHaveValue('2');
    await expect(page.getByText('2 pacote(s) × 3 unidades = 6 ventoinhas', { exact: false })).toBeVisible();
    await expectSelectionOnly(page);
    const saved = await stored(page);
    expect(saved.selectedComponents.cooler.id).toBe(previousCooler.id);
    expect(saved.selectedComponents.fans.map(item => ({ id: item.id, quantity: item.quantity }))).toEqual([{ id: previousFan.id, quantity: 2 }]);
    expect(saved.coolingConditions).toEqual(conditions);
    if (status === 'missing') {
      expect(saved.selectedComponents.cooler.price).toBeNull();
      expect(saved.selectedComponents.fans[0].price).toBeNull();
      await expect(productCard(page, previousFan.name)).toContainText('Preço indisponível');
    }
    await page.reload();
    await category(page, 'Ventoinhas extras');
    await expect(page.getByRole('spinbutton', { name: `Pacotes: ${previousFan.name}`, exact: true })).toHaveValue('2');
    await page.getByRole('button', { name: `Remover ventoinhas: ${previousFan.name}`, exact: true }).click();
    await category(page, 'Cooler do processador');
    await page.getByRole('button', { name: `Remover cooler: ${previousCooler.name}`, exact: true }).click();
    expect((await stored(page)).selectedComponents.cooler).toBeUndefined();
    expect((await stored(page)).selectedComponents.fans).toEqual([]);
    for (const type of types) expect((await stored(page)).selectedComponents[type]).toEqual(core[type]);
  });
}

test('unverified cooling is distinguished from incompatible builds and can be removed', async ({ page }) => {
  await seed(page, { selectedComponents: { ...core, cooler }, wizardStep: 'review' });
  await mockWizardAnalysis(page, { compatibility: { compatible: false, status: 'unverified', alerts: [], unverifiedChecks: [{ code: 'COOLER_HEIGHT_UNVERIFIED', message: 'Altura máxima não informada.' }] } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compatibilidade não verificada', exact: true })).toBeVisible();
  await expect(page.getByText('Altura máxima não informada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atenção: incompatibilidades encontradas' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alterar refrigeração', exact: true }).click();
  await page.getByRole('button', { name: `Remover cooler: ${cooler.name}`, exact: true }).click();
  expect((await stored(page)).selectedComponents.cooler).toBeUndefined();
});

test('optional cooling can be skipped during catalog failure and is not required progress', async ({ page }) => {
  await seed(page);
  await page.route('**/api/v1/components**', route => route.fulfill({ status: 503, json: { success: false, message: 'Catálogo temporariamente indisponível' } }));
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Refrigeração');
  await expect(page.getByRole('progressbar')).toHaveAttribute('max', '9');
  await expectSelectionOnly(page);
  await expect(page.getByRole('tab', { name: /^Cooler do processador(?: ·|$)/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Refrigeração');
  const state = await stored(page);
  for (const type of types) expect(state.selectedComponents[type].id).toBe(core[type].id);
  expect(state.selectedComponents.cooler).toBeUndefined();
  expect(state.selectedComponents.fans).toEqual([]);
  expect(state.coolingConditions).toEqual(conditions);
});

test('Performance Lab preserves scenario settings and extra fans never change CPU temperatures', async ({ page }) => {
  const cpu = components.find(item => item.id === 'cpu-intel-i7-13700k');
  const modelCooler = components.find(item => item.id === 'cooler-bequiet-pure-rock-3-black');
  await seed(page, { selectedComponents: { ...core, cpu, cooler: modelCooler }, coolingConditions: DEFAULT_COOLING_CONDITIONS });
  await thermalTask(page);
  await expect(page.getByRole('heading', { name: 'Temperatura e ruído', exact: true })).toBeVisible();
  await expect(page.getByText('Simulação aproximada', { exact: true })).toBeVisible();
  const chart = page.locator('.cooling-temperature-chart');
  await expect(chart).toBeVisible();
  const before = await chart.innerText();
  await page.goto('/build');
  await expectSelectionOnly(page);
  await category(page, 'Ventoinhas extras');
  await page.getByRole('button', { name: `Adicionar: ${fan.name}`, exact: true }).click();
  await thermalTask(page);
  await expect.poll(() => chart.innerText()).toBe(before);
  await expect(page.getByText('Subtotal parcial: há fontes sem perfil no cenário.', { exact: true })).toBeVisible();
  await page.locator('.cooling-simulation-controls summary').click();
  await page.getByRole('spinbutton', { name: 'Ar na entrada do cooler (°C)', exact: true }).fill('30');
  await expect.poll(() => chart.innerText()).not.toBe(before);
  await page.reload();
  await category(page, 'Temperatura e ruído');
  await page.locator('.cooling-simulation-controls summary').click();
  await expect(page.getByRole('spinbutton', { name: 'Ar na entrada do cooler (°C)', exact: true })).toHaveValue('30');
  expect((await stored(page)).selectedComponents.fans.map(item => ({ id: item.id, quantity: item.quantity }))).toEqual([{ id: fan.id, quantity: 1 }]);
  await page.getByRole('spinbutton', { name: 'Potência de referência do cenário (W)', exact: true }).fill('301');
  await expect(chart).toHaveCount(0);
  await page.getByRole('button', { name: 'Restaurar cenário', exact: true }).click();
  await expect(chart).toBeVisible();
  expect((await stored(page)).coolingConditions).toEqual(DEFAULT_COOLING_CONDITIONS);
  await page.locator('.cooling-simulation-method > summary').click();
  await page.getByText('Ver referência medida deste par', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Temperatura em teste publicado', exact: true })).toBeVisible();
  await expect(page.getByText('95 °C', { exact: true })).toBeVisible();
  await page.goto('/build');
  await category(page, 'Cooler do processador');
  await page.getByRole('button', { name: `Selecionar: ${cooler.name}`, exact: true }).click();
  await thermalTask(page);
  await expect(chart).toHaveCount(0);
  await expect(page.getByText('95 °C', { exact: true })).toHaveCount(0);
});
