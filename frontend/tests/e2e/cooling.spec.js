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
  await page.getByRole('combobox', { name: 'Cooler do processador', exact: true }).selectOption(cooler.id);
  await page.getByRole('combobox', { name: 'Adicionar ventoinhas', exact: true }).selectOption(fan.id);
  await page.getByRole('spinbutton', { name: 'Pacotes de ventoinhas 1', exact: true }).fill('2');
  await expect(page.getByText('6 ventoinha(s) física(s)', { exact: false })).toBeVisible();
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
  await page.getByRole('button', { name: 'Remover cooler', exact: true }).click();
});
