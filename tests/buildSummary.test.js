import { currentBuild, currentBuildTotal } from './helpers/current-build.js';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';

const validBuild = { ...currentBuild };

test('deve gerar resumo final estruturado para uma build completa', () => {
  const summary = generateBuildSummary({
    build: validBuild,
    budget: {
      amount: Number((currentBuildTotal() + 300.7).toFixed(2)),
      currency: 'BRL',
      priority: 'cost-benefit'
    },
    gameId: 'game-cyberpunk-2077',
    usageType: 'gaming',
    targetResolution: '1080p',
    qualityPreset: 'high'
  });

  assert.equal(summary.components.cpu.id, validBuild.cpuId);
  assert.equal(summary.components.gpu.id, validBuild.gpuId);
  assert.equal(summary.totalEstimatedPrice, currentBuildTotal());
  assert.equal(summary.compatibility.compatible, true);
  assert.deepEqual(summary.compatibility.alerts, []);
  assert.equal(summary.bottlenecks.hasBottleneck, false);
  assert.equal(summary.budgetStatus.amount, Number((currentBuildTotal() + 300.7).toFixed(2)));
  assert.equal(summary.budgetStatus.remaining, 300.7);
  assert.equal(summary.budgetStatus.status, 'within_budget');
  assert.equal(summary.gamePerformance.gameId, 'game-cyberpunk-2077');
  assert.equal(Number.isInteger(summary.gamePerformance.estimatedFps), true);
  assert.equal(summary.summary.includes('configuração está compatível'), true);
  assert.equal(summary.finalRecommendation, 'Configuração recomendada para o perfil informado.');
});

test('deve funcionar sem orcamento e sem jogo informado', () => {
  const summary = generateBuildSummary({
    build: validBuild
  });

  assert.equal(summary.components.motherboard.id, validBuild.motherboardId);
  assert.equal(summary.totalEstimatedPrice, currentBuildTotal());
  assert.equal(summary.compatibility.compatible, true);
  assert.equal(summary.budgetStatus, undefined);
  assert.equal(summary.gamePerformance, undefined);
  assert.equal(summary.bottlenecks.hasBottleneck, false);
});

test('deve destacar incompatibilidades no resumo final', () => {
  const summary = generateBuildSummary({
    build: {
      ...validBuild,
      motherboardId: 'mb-h610m-ddr4'
    },
    budget: {
      amount: 4500,
      currency: 'BRL'
    }
  });

  assert.equal(summary.compatibility.compatible, false);
  assert.equal(summary.compatibility.alerts.length > 0, true);
  assert.equal(summary.summary.includes('incompatibilidades'), true);
  assert.equal(summary.finalRecommendation.includes('Revise as incompatibilidades'), true);
});

test('deve informar quando analise opcional nao tiver dados suficientes', () => {
  createAdminComponent({
    id: 'cpu-build-summary-no-performance-score',
    price: 500, // Isolate missing performance data; price is independently required for totals.
    name: 'CPU Build Summary Sem Score',
    type: 'cpu',
    brand: 'Test',
    socket: 'AM4',
    cores: 4,
    threads: 8,
    baseClock: 3.2,
    boostClock: 4.0,
    tdp: 65
  });

  const summary = generateBuildSummary({
    build: {
      ...validBuild,
      cpuId: 'cpu-build-summary-no-performance-score'
    }
  });

  assert.equal(summary.compatibility.compatible, true);
  assert.equal(summary.bottlenecks.available, false);
  assert.equal(summary.bottlenecks.reason, 'performance_model_unavailable');
  assert.deepEqual(summary.bottlenecks.componentsWithoutPerformanceModel, ['cpu-build-summary-no-performance-score']);
  assert.equal(summary.bottlenecks.performanceSummary, null);
});

test('deve retornar erro controlado quando build nao for informada', () => {
  assert.throws(
    () => generateBuildSummary({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para gerar o resumo da configuração.');
      return true;
    }
  );
});


test('current exact models have dated totals and evidence-backed fit while unknown BIOS stays pending', () => {
  const summary = generateBuildSummary({ build: currentBuild, budget: { amount: currentBuildTotal() },
    gameId: 'game-cyberpunk-2077', targetResolution: '1080p', qualityPreset: 'high' });
  assert.equal(summary.totalEstimatedPrice, currentBuildTotal());
  assert.equal(summary.pricing.referenceTotalComplete, true);
  assert.equal(summary.pricing.datedReferenceUnits, 7);
  assert.equal(summary.budgetStatus.remaining, 0);
  assert.equal(summary.budgetStatus.status, 'within_budget');
  assert.equal(summary.compatibility.compatible, true);
  assert.equal(summary.compatibility.status, 'compatible');
  assert.deepEqual(summary.compatibility.unverifiedChecks, []);
  assert.ok(summary.gamePerformance.estimatedFps > 0);
  const biosPending = generateBuildSummary({ build: { ...currentBuild,
    cpuId: 'cpu-intel-i5-12400f', motherboardId: 'mb-msi-pro-h610m-s-ddr4' }, gameId: 'game-valorant' });
  assert.equal(biosPending.compatibility.compatible, false);
  assert.equal(biosPending.compatibility.status, 'unverified');
  assert.deepEqual(biosPending.compatibility.unverifiedChecks.map(check => check.code), ['CPU_BIOS_UNVERIFIED']);
  assert.equal(biosPending.gamePerformance.available, false);
  assert.equal(biosPending.gamePerformance.reason, 'unverified_build');
  assert.equal('estimatedFps' in biosPending.gamePerformance, false);
  for (const [field, id] of Object.entries(currentBuild)) assert.equal(summary.components[field.slice(0, -2)].id, id);
});
