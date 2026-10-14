import { test, expect } from '@playwright/test';
import { components } from '../../../src/data/components.mock.js';
import { currentBuild } from './helpers/catalog.js';

const methodology = { basis: 'simulated', kind: 'spec_score', modelVersion: 'test-v1', shortLabel: 'Pontuação simulada', simulationSupported: false };
const selectedComponents = currentBuild(components);
const catalog = Object.values(selectedComponents).map(component => ({ ...component,
  ...(['cpu', 'gpu', 'ram', 'storage'].includes(component.category) && { performanceScore: 67, performanceMethodology: methodology }) }));
const saved = { id: 'synthetic-build', name: 'Build com pontuações simuladas', components: selectedComponents, totalEstimatedPrice: 5000 };
const ready = { ...saved, usageProfile: 'gaming', expectedPerformanceLevel: 'good', performanceBasis: 'simulated' };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(selectedComponents => localStorage.setItem('pcpowerlab-build-state', JSON.stringify({
    selectedComponents, budget: { amount: 9000, currency: 'BRL', priority: 'cost-benefit' }, usageType: 'gaming'
  })), selectedComponents);
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, catalog);
    if (path === '/saved-builds') return ok(route, [saved]);
    if (path === '/ready-builds') return ok(route, [ready]);
    if (path === '/components/cost-benefit') return ok(route, [{ component: catalog[0], performanceScore: 67, costBenefitScore: 80, performanceBasis: 'simulated' }]);
    if (path === '/build-score') return ok(route, { overallScore: 70, criteria: { compatibilityScore: 100, performanceScore: 67 }, performanceBasis: 'simulated' });
    if (path === '/build-comparison') return ok(route, {
      builds: [0, 1].map(comparisonIndex => ({ ...saved, comparisonIndex, performanceScore: 67, performanceBasis: 'simulated', compatible: true })),
      recommendedBuild: { name: saved.name, comparisonIndex: 0 }
    });
    if (path === '/recommendations/builds-by-budget-range') return ok(route, { ...ready, performanceLevel: 'good', performanceScore: 67 });
    if (['/usage-profiles', '/performance/games', '/notifications'].includes(path)) return ok(route, []);
    return route.fulfill({ status: 503, json: { success: false, message: `Rota não prevista: ${path}` } });
  });
});

test('catalog cards, details and comparison clearly distinguish simulated and absent scores', async ({ page }) => {
  const cpu = catalog.find(component => component.category === 'cpu');
  const missing = { ...cpu, id: 'cpu-missing-score', name: 'CPU sem pontuação', performanceScore: null };
  await page.route(/\/api\/v1\/components(?:\?.*)?$/, route => ok(route, [cpu, missing]));
  await page.goto('/components');
  const card = page.locator('.component-card').filter({ has: page.getByRole('heading', { name: cpu.name, exact: true }) });
  await expect(card.getByText('Pontuação simulada: 67 / 100', { exact: true })).toBeVisible();
  await expect(page.locator('.component-card').filter({ hasText: missing.name })).not.toContainText('Pontuação simulada');
  await card.getByRole('button', { name: `Detalhes de ${cpu.name}`, exact: true }).click();
  const details = page.getByRole('dialog', { name: cpu.name, exact: true });
  await expect(details).toContainText('Pontuação simulada: 67 / 100');
  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await card.getByRole('button', { name: `Detalhes de ${cpu.name}`, exact: true }).click();
  await expect(details).toContainText('Pontuação simulada: 67 / 100');
  await details.getByRole('button', { name: 'Fechar', exact: true }).click();
  for (const component of [cpu, missing]) await page.getByRole('button', { name: `Comparar: ${component.name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Comparar peças (2)', exact: true }).click();
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /^Base da pontuação/ }) });
  await expect(row.getByRole('cell')).toHaveText(['Pontuação simulada', 'Não informado']);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('ranking gives an inline simulated label beside the score', async ({ page }) => {
  await page.goto('/insights');
  const card = page.locator('.cost-benefit-card');
  await expect(card.getByText('Pontuação simulada', { exact: true })).toBeVisible();
  await expect(card).toContainText('67 / 100');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('build score and build comparison label simulated inputs next to their result', async ({ page }) => {
  await page.goto('/summary');
  await page.locator('summary').filter({ hasText: 'Pontuação da configuração' }).click();
  await page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click();
  await expect(page.locator('.build-score-card .chart-caption')).toContainText('Desempenho com pontuação simulada');
  await expect(page.getByRole('img', { name: 'Nota 70 de 100', exact: true })).toBeVisible();
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar selecionadas', exact: true }).click();
  const region = page.getByRole('region', { name: /^Comparação de configurações/ });
  await expect(region.getByText('Pontuação simulada', { exact: true })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('ready builds and new recommendations state their simulated performance basis', async ({ page }) => {
  await page.goto('/ready-builds');
  await page.getByRole('tab', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('.ready-build-card').getByText('Desempenho simulado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Recomendar', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Orçamento mínimo', exact: true }).fill('4000');
  await page.getByRole('spinbutton', { name: 'Orçamento máximo', exact: true }).fill('9000');
  await page.getByRole('button', { name: 'Gerar recomendação', exact: true }).click();
  await expect(page.locator('.recommendation-result-card').getByText('Desempenho simulado', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
