import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';
import { createAdminComponent } from '../src/services/admin-component.service.js';

const build = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow'
};
const demandingGame = { gameId: 'game-cyberpunk-2077', targetResolution: '4k', qualityPreset: 'ultra' };

test('final guidance does not recommend a balanced build with insufficient game performance', () => {
  const result = generateBuildSummary({ build, ...demandingGame, usageType: 'gaming' });
  assert.equal(result.compatibility.status, 'compatible');
  assert.equal(result.bottlenecks.hasBottleneck, false);
  assert.equal(result.gamePerformance.estimatedFps, 23);
  assert.equal(result.gamePerformance.performanceLevel, 'insufficient');
  assert.match(result.finalRecommendation, /desempenho estimado insuficiente/i);
  assert.doesNotMatch(result.finalRecommendation, /configuração recomendada/i);
});

test('insufficient game guidance takes precedence over generic bottleneck guidance', () => {
  const result = generateBuildSummary({ build: { ...build, gpuId: 'gpu-gtx-1650' }, ...demandingGame });
  assert.equal(result.compatibility.status, 'compatible');
  assert.equal(result.bottlenecks.hasBottleneck, true);
  assert.equal(result.gamePerformance.performanceLevel, 'insufficient');
  assert.match(result.finalRecommendation, /desempenho estimado insuficiente/i);
  assert.doesNotMatch(result.finalRecommendation, /configuração funciona/i);
});

test('unavailable requested game analysis cannot become an unconditional recommendation', () => {
  const result = generateBuildSummary({ build, gameId: 'game-not-found' });
  assert.equal(result.gamePerformance.available, false);
  assert.match(result.finalRecommendation, /não foi possível avaliar o desempenho/i);
  assert.doesNotMatch(result.finalRecommendation, /configuração recomendada/i);
});

test('omitting a game keeps compatibility separate from game performance approval', () => {
  const result = generateBuildSummary({ build });
  assert.equal(result.gamePerformance, undefined);
  assert.match(result.finalRecommendation, /jogo específico ainda não foi simulado/i);
  assert.doesNotMatch(result.finalRecommendation, /configuração recomendada/i);
});

test('missing performance parameters remain unavailable in final guidance', () => {
  createAdminComponent({ id: 'cpu-final-guidance-no-parameters', name: 'CPU without performance data',
    type: 'cpu', brand: 'Test', price: 500, socket: 'AM4', cores: 4, threads: 8,
    baseClock: 3.2, boostClock: 4, tdp: 65 });
  const result = generateBuildSummary({ build: { ...build, cpuId: 'cpu-final-guidance-no-parameters' } });
  assert.equal(result.compatibility.status, 'compatible');
  assert.equal(result.bottlenecks.available, false);
  assert.match(result.finalRecommendation, /dados de desempenho insuficientes/i);
});

test('compatibility and budget retain precedence over game guidance', () => {
  const incompatible = generateBuildSummary({ build: { ...build, cpuId: 'cpu-intel-i3-12100f' }, ...demandingGame });
  assert.equal(incompatible.compatibility.status, 'incompatible');
  assert.match(incompatible.finalRecommendation, /Revise as incompatibilidades/);
  const overBudget = generateBuildSummary({ build, ...demandingGame, budget: { amount: 100 } });
  assert.equal(overBudget.budgetStatus.status, 'over_budget');
  assert.match(overBudget.finalRecommendation, /reduzir o custo total/);
});
