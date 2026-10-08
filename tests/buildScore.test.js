import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { calculateBuildScore } from '../src/services/buildScoreService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve calcular nota geral de uma build compativel', () => {
  const score = calculateBuildScore({
    build: validBuild,
    budget: {
      amount: 5000,
      currency: 'BRL'
    },
    usageType: 'gaming'
  });

  assert.equal(Number.isInteger(score.overallScore), true);
  assert.equal(score.overallScore >= 75, true);
  assert.equal(score.classification, 'Muito boa');
  assert.equal(score.criteria.compatibilityScore, 100);
  assert.equal(score.criteria.performanceScore > 0, true);
  assert.equal(score.criteria.balanceScore, 100);
  assert.equal(score.criteria.budgetScore > 90, true);
  assert.equal(score.summary.includes('compatibilidade'), true);
});

test('deve reduzir fortemente a nota quando a build for incompativel', () => {
  const score = calculateBuildScore({
    build: {
      ...validBuild,
      motherboardId: 'mb-h610m-ddr4'
    },
    budget: {
      amount: 5000,
      currency: 'BRL'
    },
    usageType: 'gaming'
  });

  assert.equal(score.criteria.compatibilityScore < 50, true);
  assert.equal(score.overallScore < 75, true);
  assert.equal(score.summary.includes('incompatibilidades'), true);
});

test('deve retornar nota parcial com aviso quando faltarem parametros de desempenho', () => {
  createAdminComponent({
    id: 'cpu-build-score-no-performance-score',
    price: 500, // Isolate missing performance data; price is independently required for totals.
    name: 'CPU Build Score Sem Score',
    type: 'cpu',
    brand: 'Test',
    socket: 'AM4',
    cores: 4,
    threads: 8,
    baseClock: 3.2,
    boostClock: 4.0,
    tdp: 65
  });

  const score = calculateBuildScore({
    build: {
      ...validBuild,
      cpuId: 'cpu-build-score-no-performance-score'
    },
    budget: {
      amount: 5000,
      currency: 'BRL'
    }
  });

  assert.equal(Number.isInteger(score.overallScore), true);
  assert.equal(Array.isArray(score.warnings), true);
  assert.equal(score.warnings.some((warning) => warning.includes('cpu')), true);
  assert.equal(score.criteria.balanceScore, 50);
});

test('deve retornar erro controlado quando build nao for informada', () => {
  assert.throws(
    () => calculateBuildScore({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para calcular a nota da configuração.');
      return true;
    }
  );
});
