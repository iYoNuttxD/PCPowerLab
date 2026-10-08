import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { generateBuildSummary } from '../src/services/buildSummaryService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve gerar resumo final estruturado para uma build completa', () => {
  const summary = generateBuildSummary({
    build: validBuild,
    budget: {
      amount: 5000,
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
  assert.equal(summary.totalEstimatedPrice, 4699.3);
  assert.equal(summary.compatibility.compatible, true);
  assert.deepEqual(summary.compatibility.alerts, []);
  assert.equal(summary.bottlenecks.hasBottleneck, false);
  assert.equal(summary.budgetStatus.amount, 5000);
  assert.equal(summary.budgetStatus.remaining, 300.7);
  assert.equal(summary.budgetStatus.status, 'within_budget');
  assert.equal(summary.gamePerformance.gameId, 'game-cyberpunk-2077');
  assert.equal(Number.isInteger(summary.gamePerformance.estimatedFps), true);
  assert.equal(summary.summary.includes('configuracao esta compativel'), true);
  assert.equal(summary.finalRecommendation, 'Configuracao recomendada para o perfil informado.');
});

test('deve funcionar sem orcamento e sem jogo informado', () => {
  const summary = generateBuildSummary({
    build: validBuild
  });

  assert.equal(summary.components.motherboard.id, validBuild.motherboardId);
  assert.equal(summary.totalEstimatedPrice, 4699.3);
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
  assert.equal(summary.bottlenecks.errors.some((message) => message.includes('cpu')), true);
});

test('deve retornar erro controlado quando build nao for informada', () => {
  assert.throws(
    () => generateBuildSummary({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para gerar o resumo da configuracao.');
      return true;
    }
  );
});
