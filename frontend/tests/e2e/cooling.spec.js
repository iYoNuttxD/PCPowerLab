import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';

const key = 'pcpowerlab-build-state';
const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const cooler = { id: 'test-cooler', category: 'cooler', name: 'Cooler de teste', price: 100, specs: { coolingType: 'air', supportedSockets: ['AM4'], heightMm: 150, powerWatts: 3 } };
const fan = { id: 'test-fan', category: 'fan', name: 'Pacote de teste', price: 60, specs: { diameterMm: 120, unitsPerPack: 3, powerWatts: 2 } };
const core = Object.fromEntries(types.map(type => [type, components.find(part => part.category === type)]));

test('cooling packs persist, invalidate analysis, and can be removed without compatibility approval', async ({ page }) => {
  await page.addInitScript(({ key, core }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ selectedComponents: core, wizardStep: 'review', budget: { amount: 5000 }, compatibility: { compatible: true }, summary: { summary: 'Old result' } }));
  }, { key, core });
  await page.route('**/api/v1/components', route => route.fulfill({ json: { success: true, data: [...components, cooler, fan] } }));
  await page.goto('/build');
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
  await page.addInitScript(({ key, core, cooler }) => localStorage.setItem(key, JSON.stringify({ selectedComponents: { ...core, cooler }, wizardStep: 'review', budget: { amount: 5000 }, compatibility: { compatible: false, status: 'unverified', alerts: [], unverifiedChecks: [{ code: 'COOLER_HEIGHT_UNVERIFIED', message: 'Altura máxima não informada.' }] } })), { key, core, cooler });
  await page.route('**/api/v1/components', route => route.fulfill({ json: { success: true, data: [...components, cooler, fan] } }));
  await page.goto('/build');
  await expect(page.getByRole('heading', { name: 'Compatibilidade não verificada', exact: true })).toBeVisible();
  await expect(page.getByText('Altura máxima não informada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atenção: incompatibilidades encontradas' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remover cooler', exact: true }).click();
});
