import { currentBuild } from './helpers/catalog.js';
import { test, expect } from '@playwright/test';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { components } from '../../../src/data/components.mock.js';

const key = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const cooler = { id: 'test-cooler', category: 'cooler', name: 'Cooler de teste', price: 100, specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150, powerWatts: 3 } };
const fan = { id: 'test-fan', category: 'fan', name: 'Pacote de teste', price: 60, specs: { diameterMm: 120, unitsPerPack: 3, powerWatts: 2 } };
const core = currentBuild(components);
const ok = (route, data) => route.fulfill({ json: { success: true, data } });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, [...components, cooler, fan]);
    if (path === '/performance/games') return ok(route, []);
    if (path === '/purchase-links/build') return ok(route, {});
    if (path === '/build-summary') return ok(route, { components: core, compatibility: { compatible: true, alerts: [] }, summary: 'Old result' });
    return route.fulfill({ status: 503, json: { success: false, message: `Endpoint inesperado no teste: ${path}` } });
  });
});

test('cooling packs persist, invalidate analysis, and can be removed without compatibility approval', async ({ page }) => {
  await page.addInitScript(({ key, core }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ selectedComponents: core, wizardStep: 'review', budget: { amount: 5000 } }));
  }, { key, core });
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Old result', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).compatibility?.compatible, key)).toBe(true);
  await page.getByRole('link', { name: 'Voltar e editar', exact: true }).click();
  await expect(page.locator('.wizard-actions')).toContainText('Etapa 9 de 9');
  await expect(page.getByRole('combobox', { name: 'Cooler do processador', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alterar refrigeração', exact: true }).click();
  await expect(page.locator('.wizard-actions')).toContainText('Opcional · Refrigeração');
  await page.getByRole('combobox', { name: 'Cooler do processador', exact: true }).selectOption(cooler.id);
  await page.locator('.cooling-fans summary').click();
  await page.getByRole('combobox', { name: 'Adicionar ventoinhas', exact: true }).selectOption(fan.id);
  await page.getByRole('spinbutton', { name: 'Pacotes de ventoinhas 1', exact: true }).fill('2');
  await expect(page.getByText('2 pacote(s) × 3 unidades = 6 ventoinhas', { exact: false })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.selectedComponents.fans[0].quantity).toBe(2);
  expect(saved.selectedComponents.cooler.id).toBe(cooler.id);
  expect(saved.compatibility).toBeNull();
  expect(saved.summary).toBeNull();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Pacotes de ventoinhas 1', exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'Remover cooler', exact: true }).click();
  await page.getByRole('button', { name: 'Remover ventoinhas 1', exact: true }).click();
  const cleared = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(cleared.selectedComponents.cooler).toBeUndefined();
  expect(cleared.selectedComponents.fans).toEqual([]);
  for (const type of types) expect(cleared.selectedComponents[type]).toEqual(core[type]);
});

test('unverified cooling is distinguished from incompatible builds', async ({ page }) => {
  await page.addInitScript(({ key, core, cooler }) => localStorage.setItem(key, JSON.stringify({ selectedComponents: { ...core, cooler }, wizardStep: 'review', budget: { amount: 5000 } })), { key, core, cooler });
  await mockWizardAnalysis(page, { compatibility: { compatible: false, status: 'unverified', alerts: [], unverifiedChecks: [{ code: 'COOLER_HEIGHT_UNVERIFIED', message: 'Altura máxima não informada.' }] } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compatibilidade não verificada', exact: true })).toBeVisible();
  await expect(page.getByText('Altura máxima não informada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atenção: incompatibilidades encontradas' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Alterar refrigeração', exact: true }).click();
  await page.getByRole('button', { name: 'Remover cooler', exact: true }).click();
});

test('optional cooling can be skipped during catalog failure and is not required progress', async ({ page }) => {
  await page.addInitScript(({ key, core }) => localStorage.setItem(key, JSON.stringify({ selectedComponents: core, wizardStep: 'cooling', budget: { amount: 5000 } })), { key, core });
  await page.route('**/api/v1/components**', route => route.fulfill({ status: 503, json: { success: false, message: 'Catálogo temporariamente indisponível' } }));
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Refrigeração');
  await expect(page.getByRole('progressbar')).toHaveAttribute('max', '9');
  await expect(page.locator('.cooling-fans')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Refrigeração');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  for (const type of types) expect(state.selectedComponents[type].id).toBe(core[type].id);
});

test('scenario simulation persists settings and extra fans never change CPU temperatures', async ({ page }) => {
  const cpu = components.find(item => item.id === 'cpu-intel-i7-13700k');
  const modelCooler = components.find(item => item.id === 'cooler-bequiet-pure-rock-3-black');
  await page.addInitScript(({ key, core, cpu, cooler }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ selectedComponents: { ...core, cpu, cooler }, wizardStep: 'cooling', budget: { amount: 5000 } }));
  }, { key, core, cpu, cooler: modelCooler });
  await page.goto('/build');
  await expect(page.getByRole('heading', { name: 'Temperatura e ruído', exact: true })).toBeVisible();
  await expect(page.getByText('Simulação aproximada', { exact: true })).toBeVisible();
  const chart = page.locator('.cooling-temperature-chart');
  await expect(chart).toBeVisible();
  const before = await chart.innerText();
  await page.locator('.cooling-fans summary').click();
  await page.getByRole('combobox', { name: 'Adicionar ventoinhas', exact: true }).selectOption(fan.id);
  await expect(chart).toHaveText(before);
  await expect(page.getByText('Subtotal parcial: há fontes sem perfil no cenário.', { exact: true })).toBeVisible();
  await page.locator('.cooling-simulation-controls summary').click();
  await page.getByRole('spinbutton', { name: 'Ar na entrada do cooler (°C)', exact: true }).fill('30');
  await expect(chart).not.toHaveText(before);
  await page.reload();
  await page.locator('.cooling-simulation-controls summary').click();
  await expect(page.getByRole('spinbutton', { name: 'Ar na entrada do cooler (°C)', exact: true })).toHaveValue('30');
  await expect(page.getByRole('spinbutton', { name: 'Pacotes de ventoinhas 1', exact: true })).toHaveValue('1');
  await page.getByRole('spinbutton', { name: 'Potência de referência do cenário (W)', exact: true }).fill('301');
  await expect(chart).toHaveCount(0);
  await page.getByRole('button', { name: 'Restaurar cenário', exact: true }).click();
  await expect(chart).toBeVisible();
  await page.locator('.cooling-simulation-method > summary').click();
  await page.getByText('Ver referência medida deste par', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Temperatura em teste publicado', exact: true })).toBeVisible();
  await expect(page.getByText('95 °C', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cooler do processador', exact: true }).selectOption(cooler.id);
  await expect(chart).toHaveCount(0);
  await expect(page.getByText('95 °C', { exact: true })).toHaveCount(0);
});
