import test from 'node:test';
import assert from 'node:assert/strict';

import { createPerformanceParameters } from '../src/services/performanceParametersService.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';

const valueBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

const alternativeBuild = {
  cpuId: 'cpu-intel-i5-12400f',
  motherboardId: 'mb-h610m-ddr4',
  gpuId: 'gpu-rx-7600',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

function ensureAlternativePerformanceParameters() {
  try {
    createPerformanceParameters({
      componentId: 'cpu-intel-i5-12400f',
      type: 'cpu',
      performanceScore: 82,
      gamingScore: 80,
      productivityScore: 78,
      tdp: 65
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  try {
    createPerformanceParameters({
      componentId: 'gpu-rx-7600',
      type: 'gpu',
      performanceScore: 83,
      gamingScore: 86,
      vram: 8,
      tdp: 165
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

test('deve comparar duas builds e indicar recomendacao por custo-beneficio', () => {
  ensureAlternativePerformanceParameters();

  const result = compareBuilds({
    builds: [
      {
        name: 'Build custo-beneficio',
        components: valueBuild
      },
      {
        name: 'Build alternativa',
        components: alternativeBuild
      }
    ],
    budget: {
      amount: 5000,
      currency: 'BRL'
    },
    usageType: 'gaming',
    gameId: 'game-cyberpunk-2077',
    targetResolution: '1080p',
    qualityPreset: 'high',
    comparisonCriteria: 'cost-benefit'
  });

  assert.equal(result.builds.length, 2);
  assert.equal(result.comparisonCriteria, 'cost-benefit');
  assert.equal(result.recommendedBuild.name.length > 0, true);

  for (const build of result.builds) {
    assert.equal(typeof build.totalEstimatedPrice, 'number');
    assert.equal(typeof build.compatible, 'boolean');
    assert.equal(typeof build.performanceScore, 'number');
    assert.equal(typeof build.costBenefitScore, 'number');
    assert.equal(typeof build.hasBottleneck, 'boolean');
    assert.equal(build.budgetStatus, 'within_budget');
    assert.equal(typeof build.summary, 'string');
    assert.equal(build.gamePerformance.gameId, 'game-cyberpunk-2077');
  }
});

test('deve comparar mais de duas builds', () => {
  ensureAlternativePerformanceParameters();

  const result = compareBuilds({
    builds: [
      { name: 'Build A', components: valueBuild },
      { name: 'Build B', components: alternativeBuild },
      { name: 'Build C', components: valueBuild }
    ],
    comparisonCriteria: 'balanced'
  });

  assert.equal(result.builds.length, 3);
  assert.equal(result.recommendedBuild.reason.includes('equilíbrio'), true);
});

test('deve marcar build acima do orcamento', () => {
  ensureAlternativePerformanceParameters();

  const result = compareBuilds({
    builds: [
      { name: 'Build A', components: valueBuild },
      { name: 'Build B', components: alternativeBuild }
    ],
    budget: {
      amount: 4000,
      currency: 'BRL'
    },
    comparisonCriteria: 'budget'
  });

  assert.equal(result.builds.every((build) => build.budgetStatus === 'above_budget'), true);
  assert.equal(result.recommendedBuild.reason.length > 0, true);
});

test('deve retornar erro controlado quando houver menos de duas builds', () => {
  assert.throws(
    () => compareBuilds({
      builds: [
        { name: 'Build unica', components: valueBuild }
      ]
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe pelo menos duas builds para comparação.');
      return true;
    }
  );
});

test('deve retornar erro controlado para criterio invalido', () => {
  assert.throws(
    () => compareBuilds({
      builds: [
        { name: 'Build A', components: valueBuild },
        { name: 'Build B', components: valueBuild }
      ],
      comparisonCriteria: 'unknown'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Critério de comparação inválido.');
      return true;
    }
  );
});

test('deve propagar erro controlado de build invalida', () => {
  assert.throws(
    () => compareBuilds({
      builds: [
        { name: 'Build A', components: valueBuild },
        {
          name: 'Build invalida',
          components: {
            ...valueBuild,
            cpuId: 'cpu-inexistente'
          }
        }
      ]
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.errors.some((message) => message.includes('cpu-inexistente')), true);
      return true;
    }
  );
});
