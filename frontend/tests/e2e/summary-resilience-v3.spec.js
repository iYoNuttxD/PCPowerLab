import { test, expect } from '@playwright/test';
import { listComponents } from '../../../src/services/component.service.js';
import { selectBuildComponents } from '../../../src/services/build.service.js';
import { generateBuildSummary } from '../../../src/services/buildSummaryService.js';
import { getPurchaseLinksByBuild } from '../../../src/services/purchaseLinksService.js';
import { games } from '../../../src/data/games.js';
import { currentBuild } from '../../../tests/helpers/current-build.js';

const key = 'pcpowerlab-build-state';
const budget = { amount: 10000, currency: 'BRL', priority: 'cost-benefit' };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const fail = (route, message) => route.fulfill({ status: 503, json: { success: false, message } });
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const shops = page => page.locator('section.summary-section').filter({ has: page.getByRole('heading', { name: 'Links de compra', exact: true }) });

async function seed(page, build = currentBuild) {
  const selectedComponents = { ...selectBuildComponents(build), fans: [] };
  await page.addInitScript(({ key, selectedComponents, budget }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ selectedComponents, budget }));
  }, { key, selectedComponents, budget });
  return selectedComponents;
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, listComponents({ includeLegacy: true }));
    if (path === '/performance/games') return ok(route, games);
    if (path === '/build-summary') return ok(route, generateBuildSummary(route.request().postDataJSON()));
    if (path === '/purchase-links/by-build') return ok(route, getPurchaseLinksByBuild(route.request().postDataJSON()));
    if (path === '/notifications') return ok(route, []);
    return fail(route, `Unexpected test endpoint: ${path}`);
  });
});

test('summary failure preserves independently received store links and complete selection', async ({ page }) => {
  const selected = await seed(page);
  await page.route('**/build-summary', route => fail(route, 'Resumo temporariamente indisponível.'));
  await page.goto('/summary');
  await expect(page.getByText('Peças escolhidas. Veja o desempenho aproximado e salve quando quiser.', { exact: true })).toBeVisible();
  await expect(shops(page).getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Resumo temporariamente indisponível.', { exact: true })).toBeVisible();
  await expect(shops(page).getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
  expect((await stored(page)).selectedComponents).toEqual(selected);
  expect((await stored(page)).budget).toEqual(budget);
  await page.unroute('**/build-summary');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recomendação final', exact: true })).toBeVisible();
  expect((await stored(page)).summary.selectionStatus).toBe('complete');
});

test('slow store lookup cannot delay completed summary or FPS', async ({ page }) => {
  await seed(page);
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/purchase-links/by-build', async route => {
    await pending;
    await ok(route, getPurchaseLinksByBuild(route.request().postDataJSON()));
  });
  await page.goto('/summary');
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recomendação final', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toBeVisible();
  await expect(shops(page).getByText('Carregando links das lojas...', { exact: true })).toBeVisible();
  release();
  await expect(shops(page).getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
});

test('store failure has its own retry and cannot erase summary or budget', async ({ page }) => {
  await seed(page);
  let failLinks = true;
  await page.route('**/purchase-links/by-build', route => {
    return failLinks ? fail(route, 'Lojas temporariamente indisponíveis.')
      : ok(route, getPurchaseLinksByBuild(route.request().postDataJSON()));
  });
  await page.goto('/summary');
  await expect(shops(page).getByText('Lojas temporariamente indisponíveis.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recomendação final', exact: true })).toBeVisible();
  const before = await stored(page);
  failLinks = false;
  await shops(page).getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(shops(page).getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
  expect((await stored(page)).summary).toEqual(before.summary);
  expect((await stored(page)).budget).toEqual(budget);
});

test('unknown installed BIOS does not block FPS, bottlenecks, alternatives or shops', async ({ page }) => {
  const build = { ...currentBuild, cpuId: 'cpu-intel-i5-12400f', motherboardId: 'mb-msi-pro-h610m-s-ddr4' };
  await seed(page, build);
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Gerar resumo final', exact: true }).click();
  await expect(page.getByText('Peças escolhidas. Veja o desempenho aproximado e salve quando quiser.', { exact: true })).toBeVisible();
  await expect(page.getByText(/BIOS instalado ou versão mínima/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Análise de gargalos', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Simulação indisponível', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Resultado da simulação individual' })).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'Comparar alternativa no orçamento' })).toBeVisible();
  await expect(shops(page).getByRole('link', { name: 'Pesquisar na loja', exact: true }).first()).toBeVisible();
  const state = await stored(page);
  expect(state.summary.gamePerformance.estimatedFps).toBeGreaterThan(0);
  expect(state.summary.gamePerformance.estimatedFpsRange.high).toBeGreaterThan(state.summary.gamePerformance.estimatedFpsRange.low);
  expect(state.selectedComponents.motherboard.id).toBe(build.motherboardId);
  expect(state.budget).toEqual(budget);
});
