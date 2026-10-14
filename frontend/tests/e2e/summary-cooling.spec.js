import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { currentBuild, activePart } from './helpers/catalog.js';

const storageKey = 'pcpowerlab-build-state';
const selectedComponents = { ...currentBuild(components), cooler: activePart(components, 'cooler-bequiet-pure-rock-3-black'), fans: [] };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ storageKey, selectedComponents }) => {
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify({ selectedComponents, wizardStep: 'review', budget: { amount: 6000 }, coolingConditions: { inletCelsius: 25, coolerSpeedFraction: 0.75, extraFanSpeedFraction: 0.75, referenceHeatWatts: null } }));
  }, { storageKey, selectedComponents });
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/performance/games') return ok(route, []);
    if (path === '/purchase-links/build') return ok(route, {});
    return route.fulfill({ status: 503, json: { success: false, message: `Rota não prevista: ${path}` } });
  });
});

test('review opens Summary cooling charts with focused target and retained scenario', async ({ page }) => {
  await page.goto('/build');
  await expect(page.locator('#wizard-step-heading')).toHaveText('Revisão');
  await page.getByRole('link', { name: 'Ver temperatura e ruído', exact: true }).click();
  await expect(page).toHaveURL(/\/summary#cooling-simulation$/);
  const section = page.locator('#cooling-simulation');
  await expect(section).toBeFocused();
  await expect(section.locator('.cooling-temperature-chart')).toBeVisible();
  await expect(section.getByText('Simulação aproximada', { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const box = await section.boundingBox();
    const header = await page.locator('.topbar').boundingBox();
    return box.y >= header.y + header.height;
  }).toBe(true);
  await section.locator('.cooling-simulation-controls > summary').click();
  await section.getByLabel('Ar na entrada do cooler (°C)', { exact: true }).fill('30');
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).coolingConditions.inletCelsius, storageKey)).toBe(30);
  await page.reload();
  await expect(section).toBeFocused();
  await section.locator('.cooling-simulation-controls > summary').click();
  await expect(section.getByLabel('Ar na entrada do cooler (°C)', { exact: true })).toHaveValue('30');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(state.selectedComponents.cooler.id).toBe(selectedComponents.cooler.id);
  expect(state.selectedComponents.fans).toEqual([]);
});

test('cooling selection uses product cards and exposes no simulator before Summary', async ({ page }) => {
  await page.goto('/build');
  await page.getByRole('button', { name: 'Alterar refrigeração', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Refrigeração');
  await expect(page.locator('.cooling-panel .component-card').first()).toBeVisible();
  await expect(page.locator('.cooling-panel .cooling-simulation')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Cooler do processador', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('#wizard-step-heading')).toHaveText('Orçamento');
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);
  expect(state.selectedComponents.cooler.id).toBe(selectedComponents.cooler.id);
});
