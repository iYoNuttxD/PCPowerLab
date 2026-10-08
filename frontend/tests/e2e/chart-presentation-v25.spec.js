import { currentBuild } from './helpers/catalog.js';
// Authored for a future authorized browser run; collection is not execution.
import { test, expect } from '@playwright/test';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { components } from '../../../src/data/components.mock.js';
import { games } from '../../../src/data/games.js';
import { professionalSoftware } from '../../../src/data/professionalSoftware.js';

const selectedComponents = { ...currentBuild(components), fans: [] };
const ok = (route, data) => route.fulfill({ json: { success: true, data } });
const powerSummary = { cpuScore: 0, gpuScore: 90, ramScore: 65, storageScore: 80, estimatedConsumptionWatts: 300, psuWatts: 650 };
async function seed(page, extra = {}) {
  await page.addInitScript(state => localStorage.setItem('pcpowerlab-build-state', JSON.stringify(state)), {
    selectedComponents, wizardStep: 'review', budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' },
    compatibility: { compatible: true, alerts: [] }, ...extra
  });
}
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/components') return ok(route, components);
    if (path === '/performance/games') return ok(route, games);
    if (path === '/professional-software') return ok(route, professionalSoftware);
    return route.fulfill({ status: 503, json: { success: false, message: `Rota não prevista: ${path}` } });
  });
});

test('gráficos têm títulos, unidades e categorias legíveis sem depender da cor', async ({ page }) => {
  await seed(page);
  await mockWizardAnalysis(page, { bottlenecks: { hasBottleneck: false, performanceSummary: powerSummary } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pontuação de desempenho por componente' })).toBeVisible();
  const energy = page.getByRole('group', { name: 'Gráfico de consumo energético da build' });
  for (const label of ['Consumo', 'Referência', 'Fonte']) await expect(energy.getByText(label, { exact: true })).toBeVisible();
  const legend = page.getByRole('group', { name: 'Legenda do consumo energético' });
  await expect(legend).toContainText('Consumo estimado: 300 W');
  await expect(legend).toContainText('Referência da fonte com folga: 450 W');
  await expect(legend).toContainText('Capacidade nominal da fonte: 650 W');
  await expect(page.getByRole('group', { name: 'Legenda do desempenho dos componentes' })).toContainText('0 pontos');
  await expect(page.getByText(/não o consumo medido na tomada/)).toBeVisible();
  const extent = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(extent.content).toBeLessThanOrEqual(extent.viewport + 1);
});

test('consumo parcial não apresenta referência da fonte nem diferença como cálculo completo', async ({ page }) => {
  await seed(page);
  await mockWizardAnalysis(page, { bottlenecks: { hasBottleneck: false, performanceSummary: { ...powerSummary, powerEstimateComplete: false, unknownPowerComponents: ['cooler-unknown'] } } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Consumo parcial' })).toBeVisible();
  const legend = page.getByRole('group', { name: 'Legenda do consumo energético' });
  await expect(legend).toContainText('Consumo parcial conhecido: 300 W');
  await expect(legend).toContainText('Referência da fonte com folga: Não disponível');
  await expect(page.locator('.energy-note')).toHaveCount(0);
  const graph = page.getByRole('group', { name: 'Gráfico de consumo energético da build' });
  await expect(graph.getByText('Parcial', { exact: true })).toBeVisible();
  await expect(graph.getByText('Referência', { exact: true })).toHaveCount(0);
});

test('nota ausente continua diferente de zero e mantém critério disponível', async ({ page }) => {
  await seed(page);
  await page.route('**/build-score', route => ok(route, { overallScore: null, criteria: { compatibilityScore: 0, performanceScore: null } }));
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Nota geral não disponível' })).toBeVisible();
  const performance = page.locator('.criterion-card').filter({ hasText: 'Desempenho' });
  await expect(performance).toContainText('Não disponível');
  await expect(performance.locator('.score-bar i')).toHaveCount(0);
  const compatibility = page.locator('.criterion-card').filter({ hasText: 'Compatibilidade' });
  await expect(compatibility.locator('strong')).toHaveText('0');
  await expect(compatibility.locator('.score-bar i')).toHaveAttribute('style', 'width: 0%;');
});

test('tabela FPS recupera nomes completos e valores sem depender de hover', async ({ page }) => {
  await seed(page);
  const longName = 'Jogo com nome muito longo para verificar a alternativa textual completa';
  await page.route('**/performance/compare-games', route => ok(route, {
    targetResolution: '1080p', qualityPreset: 'high', results: [
      { gameId: games[0].id, gameName: longName, estimatedFps: 0, meetsMinimumRequirements: false },
      { gameId: games[1].id, gameName: 'Jogo sem dado', estimatedFps: null }
    ]
  }));
  await page.goto('/performance-lab');
  await page.getByRole('radio', { name: /^Comparar jogos/ }).check();
  const boxes = page.getByRole('group', { name: 'Jogos para comparação' }).getByRole('checkbox');
  await expect(boxes.first()).toBeVisible();
  for (const checkbox of await boxes.all()) await checkbox.uncheck();
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await page.getByRole('button', { name: 'Comparar jogos', exact: true }).click();
  const results = page.getByRole('region', { name: 'Resultado da comparação de jogos' });
  await expect(results.getByRole('heading', { name: 'FPS estimado por jogo' })).toBeVisible();
  const summary = results.locator('summary').filter({ hasText: 'Ver resultados e requisitos por jogo' });
  await summary.focus();
  await page.keyboard.press('Enter');
  const table = results.getByRole('region', { name: 'Tabela dos resultados por jogo' });
  await expect(table.getByRole('row').filter({ hasText: longName })).toContainText('0');
  await expect(table.getByRole('row').filter({ hasText: 'Jogo sem dado' })).toContainText('Não disponível');
  await table.focus();
  await expect(table).toBeFocused();
});
