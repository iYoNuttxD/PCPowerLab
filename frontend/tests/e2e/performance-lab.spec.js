import { currentBuild } from './helpers/catalog.js';
import { test, expect } from '@playwright/test';
import { mockWizardAnalysis } from './helpers/analysis.js';
import { components } from '../../../src/data/components.mock.js';
import { games } from '../../../src/data/games.js';
import { professionalSoftware } from '../../../src/data/professionalSoftware.js';

const types = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
const selectedComponents = currentBuild(components);
const storageKey = 'pcpowerlab-build-state';
const singleResult = {
  gameId: games[0].id, game: games[0].name, targetResolution: '1440p', qualityPreset: 'low',
  estimatedFps: 144, performanceLevel: 'insufficient', meetsMinimumRequirements: false, meetsRecommendedRequirements: false,
  summary: 'Resultado de teste com requisitos insuficientes apesar de FPS alto.',
  details: { cpuStatus: 'belowMinimum', gpuStatus: 'recommended', ramStatus: 'recommended', storageStatus: 'belowRecommended' },
  technicalDetails: { weightedPerformanceIndex: 92.5, qualityMultiplier: 1.15, resolutionMultiplier: 0.75, bottleneckPenalty: 0.85,
    bottlenecks: [{ type: 'cpu_bottleneck', severity: 'high', message: 'O processador pode limitar o conjunto.', technicalDetails: { differencePercent: 42 } }] }
};
const comparisonResult = {
  targetResolution: '1080p', qualityPreset: 'high', summary: 'Comparação de teste.',
  results: [
    { gameId: games[0].id, gameName: games[0].name, estimatedFps: 144, performanceLevel: 'insufficient', meetsMinimumRequirements: false, meetsRecommendedRequirements: false },
    { gameId: games[1].id, gameName: games[1].name, estimatedFps: 48, performanceLevel: 'basic', meetsMinimumRequirements: true, meetsRecommendedRequirements: false }
  ]
};
const failures = new WeakMap();
async function ok(route, data) { return route.fulfill({ json: { success: true, data } }); }
async function fail(route, message, status = 503, errors = []) { return route.fulfill({ status, json: { success: false, message, errors } }); }
async function seed(page, extra = {}) {
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), {
    key: storageKey, state: { selectedComponents, budget: { amount: 5000, currency: 'BRL', priority: 'cost-benefit' }, ...extra }
  });
}
async function compareMode(page) { await page.getByRole('radio', { name: /^Comparar jogos/ }).check(); }
const singleRegion = page => page.getByRole('region', { name: 'Resultado da simulação individual' });
const comparisonRegion = page => page.getByRole('region', { name: 'Resultado da comparação de jogos' });

test.beforeEach(async ({ page }) => {
  const errors = [];
  failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    if (path === '/performance/games') return ok(route, games);
    if (path === '/professional-software') return ok(route, professionalSoftware);
    if (path === '/performance/simulate-game') return ok(route, singleResult);
    if (path === '/performance/compare-games') return ok(route, comparisonResult);
    if (path === '/performance/simulate-software') return ok(route, { software: professionalSoftware[0].name, performanceScore: 76, performanceLevel: 'good', meetsMinimumRequirements: true, meetsRecommendedRequirements: false, details: { cpuStatus: 'recommended' } });
    if (path === '/components') return ok(route, components);
    return fail(route, `Endpoint inesperado no teste: ${path}`);
  });
});
test.afterEach(async ({ page }) => { expect(failures.get(page)).toEqual([]); });

test('simula um único jogo pelo contrato existente e preserva classificação, requisitos e detalhes da API', async ({ page }) => {
  await seed(page);
  await page.goto('/performance-lab');
  await expect(page.getByRole('radio', { name: /^Simular um jogo/ })).toBeChecked();
  await page.getByRole('combobox', { name: 'Jogo', exact: true }).selectOption(games[0].id);
  await page.getByRole('combobox', { name: 'Resolução', exact: true }).selectOption('1440p');
  await page.getByRole('combobox', { name: 'Qualidade gráfica', exact: true }).selectOption('low');
  const request = page.waitForRequest(request => request.url().endsWith('/performance/simulate-game'));
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  const payload = (await request).postDataJSON();
  expect(payload).toEqual({ gameId: games[0].id, targetResolution: '1440p', qualityPreset: 'low', build: { ...Object.fromEntries(types.map(type => [`${type}Id`, selectedComponents[type].id])), fans: [] } });
  const result = singleRegion(page);
  await expect(result.getByText('144 FPS', { exact: true })).toBeVisible();
  await expect(result.getByText('Insuficiente', { exact: true })).toBeVisible();
  await expect(result.getByText(/A configuração está abaixo dos requisitos mínimos/)).toBeVisible();
  await expect(result.getByText('Estimativa, não medição real.', { exact: true })).toBeVisible();
  await expect(result.getByText(/não é garantido/)).toBeVisible();
  await expect(page.getByText('Simulação concluída. Confira os resultados abaixo.', { exact: true })).toBeVisible();
  await result.locator('summary').filter({ hasText: 'Ver requisitos' }).click();
  await expect(result.getByText('92,5', { exact: true })).toBeVisible();
  await expect(result.getByText('0,85', { exact: true })).toBeVisible();
  await expect(result.getByText('Abaixo do mínimo', { exact: true })).toBeVisible();
  await expect(result.getByText('O processador pode limitar o conjunto.', { exact: true })).toBeVisible();
});

test('compara vários jogos e usa requisitos da API em vez de inferi-los por 60 FPS', async ({ page }) => {
  let release;
  await seed(page);
  await page.route('**/performance/compare-games', async route => { await new Promise(resolve => { release = resolve; }); await ok(route, comparisonResult); });
  await page.goto('/performance-lab');
  await compareMode(page);
  const group = page.getByRole('group', { name: 'Jogos para comparação' });
  await expect(group.getByRole('checkbox').first()).toBeVisible();
  const boxes = group.getByRole('checkbox');
  for (const checkbox of await boxes.all()) await checkbox.uncheck();
  const button = page.getByRole('button', { name: 'Comparar jogos', exact: true });
  await expect(button).toBeDisabled();
  await boxes.nth(0).check();
  await expect(page.getByText('Selecione de 2 a 10 jogos para comparar.', { exact: true })).toBeVisible();
  await expect(button).toBeDisabled();
  await boxes.nth(1).check();
  const request = page.waitForRequest(request => request.url().endsWith('/performance/compare-games'));
  await button.click();
  expect((await request).postDataJSON().gameIds).toEqual([games[0].id, games[1].id]);
  await expect(button).toBeDisabled();
  await expect(page.getByText('Calculando estimativas para a sua configuração...', { exact: true })).toBeVisible();
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  const result = comparisonRegion(page);
  await expect(result.getByRole('group', { name: 'Gráfico comparativo de FPS estimado por jogo' })).toBeVisible();
  await expect(result.getByText(/não a verificação dos requisitos recomendados/)).toBeVisible();
  await result.locator('summary').filter({ hasText: 'Ver resultados e requisitos' }).click();
  const row = result.getByRole('row').filter({ hasText: games[0].name });
  await expect(row).toContainText('144');
  await expect(row).toContainText('Insuficiente');
  await expect(row.getByRole('cell', { name: 'Não', exact: true })).toHaveCount(2);
  for (const checkbox of (await boxes.all()).slice(2, 11)) await checkbox.check();
  await expect(button).toBeDisabled();
  await expect(result).toHaveCount(0);
});

test('troca de modo, jogo e configurações invalida resultado e ignora resposta atrasada', async ({ page }) => {
  let release;
  await seed(page);
  await page.route('**/performance/simulate-game', async route => { await new Promise(resolve => { release = resolve; }); await ok(route, singleResult); });
  await page.goto('/performance-lab');
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(page.getByText('Calculando estimativas para a sua configuração...', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simular jogo', exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  await compareMode(page);
  release();
  await page.getByRole('button', { name: 'Comparar jogos', exact: true }).click();
  await expect(comparisonRegion(page)).toBeVisible();
  await expect(singleRegion(page)).toHaveCount(0);
  await page.getByRole('radio', { name: /^Simular um jogo/ }).check();
  await expect(singleRegion(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Simular jogo', exact: true })).toBeEnabled();
  await page.route('**/performance/simulate-game', route => ok(route, singleResult));
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(singleRegion(page)).toBeVisible();
  await page.getByRole('combobox', { name: 'Jogo', exact: true }).selectOption(games[1].id);
  await expect(singleRegion(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(singleRegion(page)).toBeVisible();
  await page.getByRole('combobox', { name: 'Qualidade gráfica', exact: true }).selectOption('ultra');
  await expect(singleRegion(page)).toHaveCount(0);
});

test('build incompleta bloqueia ambos os modos sem chamar as APIs', async ({ page }) => {
  let requests = 0;
  await seed(page, { selectedComponents: { cpu: selectedComponents.cpu } });
  await page.route('**/performance/simulate-game', route => { requests++; return ok(route, singleResult); });
  await page.route('**/performance/compare-games', route => { requests++; return ok(route, comparisonResult); });
  await page.goto('/performance-lab');
  await expect(page.getByText('Build incompleta', { exact: true })).toBeVisible();
  await expect(page.getByText(/Faltam peças: Placa de vídeo/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir para Montar PC', exact: true })).toHaveAttribute('href', '/build');
  await expect(page.getByRole('button', { name: 'Simular jogo', exact: true })).toBeDisabled();
  await compareMode(page);
  await expect(page.getByRole('button', { name: 'Comparar jogos', exact: true })).toBeDisabled();
  expect(requests).toBe(0);
});

test('ausência de parâmetros, falha de rede e falha de comparação permitem tentar novamente', async ({ page }) => {
  await seed(page);
  await page.route('**/performance/simulate-game', route => fail(route, 'Parametros de desempenho insuficientes para simulacao de jogos.', 400, ['Parametros de desempenho nao encontrados para cpu.']));
  await page.goto('/performance-lab');
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Faltam dados de desempenho');
  await page.locator('summary').filter({ hasText: 'Ver detalhes do erro' }).click();
  await expect(page.getByText('Parametros de desempenho nao encontrados para cpu.', { exact: true })).toBeVisible();
  await page.route('**/performance/simulate-game', route => route.abort());
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Verifique sua conexão');
  await page.route('**/performance/simulate-game', route => ok(route, singleResult));
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(singleRegion(page)).toBeVisible();
  await compareMode(page);
  await page.route('**/performance/compare-games', route => fail(route, 'Parametros de desempenho insuficientes para comparacao.', 400));
  await page.getByRole('button', { name: 'Comparar jogos', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Faltam dados de desempenho');
  await page.route('**/performance/compare-games', route => fail(route, 'Serviço indisponível. Tente novamente.', 503));
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Serviço indisponível');
  await expect(comparisonRegion(page)).toHaveCount(0);
  await page.route('**/performance/compare-games', route => ok(route, comparisonResult));
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(comparisonRegion(page)).toBeVisible();
});

test('carregamento, erro e catálogo vazio são distintos; falha de software não bloqueia jogos', async ({ page }) => {
  let release;
  await seed(page);
  await page.route('**/performance/games', async route => { await new Promise(resolve => { release = resolve; }); await fail(route, 'Jogos indisponíveis.'); });
  await page.route('**/professional-software', route => fail(route, 'Softwares indisponíveis.'));
  await page.goto('/performance-lab');
  await expect(page.getByText('Carregando jogos...', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simular jogo', exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(release)).toBe(true);
  release();
  const card = page.locator('.performance-lab-card').filter({ has: page.getByRole('heading', { name: 'Desempenho em jogos', exact: true }) });
  await expect(card.getByRole('alert')).toContainText('Jogos indisponíveis');
  await expect(card.getByText('Nenhum jogo encontrado', { exact: true })).toHaveCount(0);
  await page.route('**/performance/games', route => ok(route, []));
  await card.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(card.getByText('Nenhum jogo encontrado', { exact: true })).toBeVisible();
  await page.route('**/performance/games', route => ok(route, [games[1]]));
  await card.getByRole('button', { name: 'Atualizar jogos', exact: true }).click();
  await expect(card.getByRole('combobox', { name: 'Jogo', exact: true })).toHaveValue(games[1].id);
  await expect(card.getByRole('button', { name: 'Simular jogo', exact: true })).toBeEnabled();
  await card.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(singleRegion(page)).toBeVisible();
});

test('dados ausentes não viram zero FPS nem entram na média', async ({ page }) => {
  await seed(page);
  await page.route('**/performance/simulate-game', route => ok(route, { ...singleResult, estimatedFps: null }));
  await page.route('**/performance/compare-games', route => ok(route, { ...comparisonResult, results: [{ ...comparisonResult.results[0], estimatedFps: null }, comparisonResult.results[1]] }));
  await page.goto('/performance-lab');
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(singleRegion(page).getByText('Não disponível', { exact: true })).toBeVisible();
  await expect(singleRegion(page).getByText('0 FPS', { exact: true })).toHaveCount(0);
  await compareMode(page);
  await page.getByRole('button', { name: 'Comparar jogos', exact: true }).click();
  await expect(comparisonRegion(page).getByText('48 FPS', { exact: true })).toBeVisible();
  await expect(comparisonRegion(page).getByText(/Há jogos sem FPS disponível/)).toBeVisible();
});

test('simulação profissional mantém funcionamento e erros separados do jogo', async ({ page }) => {
  await seed(page);
  await page.goto('/performance-lab');
  await page.getByRole('button', { name: 'Simular software', exact: true }).click();
  const result = page.getByRole('region', { name: 'Resultado da simulação profissional' });
  await expect(result.getByText('76', { exact: true })).toBeVisible();
  await expect(result.getByText(/Nenhum teste foi executado/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Software', exact: true }).selectOption(professionalSoftware[1].id);
  await expect(result).toHaveCount(0);
  await page.route('**/performance/simulate-software', route => fail(route, 'Simulação profissional indisponível.'));
  await page.getByRole('button', { name: 'Simular software', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Simulação profissional indisponível.');
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  await expect(singleRegion(page)).toBeVisible();
});

test('explicações e detalhes são acessíveis por teclado', async ({ page }) => {
  await seed(page);
  await page.goto('/performance-lab');
  const radio = page.getByRole('radio', { name: /^Simular um jogo/ });
  await radio.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^Comparar jogos/ })).toBeChecked();
  await page.keyboard.press('ArrowLeft');
  await expect(radio).toBeChecked();
  await page.getByRole('button', { name: 'Simular jogo', exact: true }).click();
  const summary = singleRegion(page).locator('summary').filter({ hasText: 'Como interpretar' });
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(singleRegion(page).getByText(/Quadros por segundo:/)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(singleRegion(page).getByText(/Quadros por segundo:/)).toBeHidden();
});

test('resumo distingue compatibilidade pendente e mantém avisos da nota geral visíveis', async ({ page }) => {
  await seed(page);
  await page.route('**/build-score', route => ok(route, { overallScore: 75, classification: 'Muito boa', criteria: { compatibilityScore: 100, performanceScore: 75, balanceScore: 70, budgetScore: 80, costBenefitScore: 60 }, warnings: ['Parâmetros de desempenho ausentes para: cpu.'] }));
  await page.goto('/summary');
  await expect(page.locator('.build-status-card')).toContainText('Compatibilidade não verificada');
  await expect(page.locator('.build-status-card')).not.toContainText('Nenhuma incompatibilidade crítica');
  await page.getByRole('button', { name: 'Calcular nota da build', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Limitações desta nota' })).toContainText('Parâmetros de desempenho ausentes para: cpu.');
  await expect(page.getByText(/As barras detalham os critérios usados/)).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Como interpretar a nota e seus critérios' }).click();
  await expect(page.getByText(/Combina compatibilidade, desempenho, equilíbrio/)).toBeVisible();
});

test('gargalos e energia explicam unidades e preservam os valores e detalhes técnicos', async ({ page }) => {
  await seed(page, { wizardStep: 'review' });
  await mockWizardAnalysis(page, { bottlenecks: {
    hasBottleneck: true, overallBalance: 'moderate', performanceSummary: { cpuScore: 70, gpuScore: 90, ramScore: 65, storageScore: 80, estimatedConsumptionWatts: 300, psuWatts: 650 },
    bottlenecks: [{ type: 'cpu_bottleneck', severity: 'medium', component: 'cpu', message: 'Limitação estimada do processador.', technicalDetails: { differencePercent: 20 } }]
  } });
  await page.goto('/build');
  await page.getByRole('button', { name: 'Analisar build', exact: true }).click();
  await expect(page.getByText(/os pontos não são FPS/)).toBeVisible();
  await expect(page.getByText(/não o consumo medido na tomada/)).toBeVisible();
  await expect(page.getByText('Referência da fonte com folga: 450 W', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Como interpretar a referência da fonte' }).click();
  await expect(page.getByText(/acrescido de 35% de folga/)).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Ver detalhes técnicos deste gargalo' }).click();
  await expect(page.getByText('20%', { exact: true })).toBeVisible();
  const help = page.locator('summary').filter({ hasText: 'Como interpretar estes resultados' });
  await help.click();
  await expect(page.getByText(/Energia ao longo do tempo é expressa em kWh/)).toBeVisible();
});

test('ranking explica a normalização por categoria e mantém preço e pontuação', async ({ page }) => {
  await page.route('**/components/cost-benefit*', route => ok(route, [{ component: components[0], performanceScore: 70, costBenefitScore: 100, classification: 'Excelente' }]));
  await page.goto('/insights');
  await expect(page.getByText(/A nota de custo-benefício é relativa à categoria/)).toBeVisible();
  const help = page.locator('summary').filter({ hasText: 'Como ler este ranking' });
  await help.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText(/a melhor relação de cada categoria recebe 100 pontos/)).toBeVisible();
  await expect(page.getByText('70 / 100', { exact: true })).toBeVisible();
  await expect(page.getByText('100 / 100', { exact: true })).toBeVisible();
});
