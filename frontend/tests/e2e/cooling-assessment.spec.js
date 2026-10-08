import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { currentBuild } from './helpers/catalog.js';

const selected = currentBuild(components);
const assessment = { status: 'unverified', scope: 'cooling_not_assessed', unverifiedChecks: [{ code: 'CPU_COOLING_FIT_UNVERIFIED', message: 'Encaixe do cooler não verificado.' }], alerts: [] };
const compatibility = { compatible: true, status: 'compatible', alerts: [], unverifiedChecks: [], coolingAssessment: assessment };
const ready = { id: 'ready-cooling-scope', name: 'Build com refrigeração pendente', usageProfile: 'gaming', components: selected, compatibility, targetBudgetRange: { min: 1000, max: 9000 } };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/ready-builds') return ok(route, [ready]);
    if (path === '/share/build/cooling-scope') return ok(route, { shareId: 'cooling-scope', name: ready.name, buildSummary: { components: selected, compatibility } });
    if (['/usage-profiles', '/performance/games'].includes(path)) return ok(route, []);
    return route.fulfill({ status: 503, json: { success: false, message: `Rota não prevista: ${path}` } });
  });
});

test('ready build cooling uncertainty is visible before use and does not block the core-valid selection', async ({ page }) => {
  await page.goto('/ready-builds');
  await page.getByRole('tab', { name: 'Explorar', exact: true }).click();
  const card = page.locator('.ready-build-card');
  await expect(card.getByText('Refrigeração não verificada', { exact: true })).toBeVisible();
  await expect(card).toContainText('Peças principais compatíveis');
  await expect(card.getByRole('button', { name: 'Usar build inteira', exact: true })).toBeEnabled();
  await expect(card).toContainText('incluindo a refrigeração');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('shared core-compatible build has a visible partial verdict rather than an unqualified OK', async ({ page }) => {
  await page.goto('/shared/cooling-scope');
  await expect(page.getByRole('heading', { name: 'Peças principais compatíveis', exact: true })).toBeVisible();
  await expect(page.getByText('Refrigeração não verificada', { exact: true })).toBeVisible();
  await expect(page.getByText('Parcial', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build compatível', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
