import { currentBuild, currentBuildTotal, currentPrice } from './helpers/current-build.js';
import test from 'node:test';
import assert from 'node:assert/strict';

import { compareBuilds } from '../src/services/buildComparisonService.js';

const valueBuild = { ...currentBuild };

const alternativeBuild = { ...currentBuild, cpuId: 'cpu-ryzen-7-5700x', gpuId: 'gpu-gigabyte-rx-7600-gaming-oc-8g' };

test('deve comparar duas builds e indicar recomendacao por custo-beneficio', () => {

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
      amount: 10000,
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
  assert.equal(result.builds[0].totalEstimatedPrice, currentBuildTotal());
  assert.equal(result.builds[1].totalEstimatedPrice, currentBuildTotal({
    cpu: alternativeBuild.cpuId, motherboard: alternativeBuild.motherboardId, gpu: alternativeBuild.gpuId
  }));

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

test('comparacao por custo exclui preco desconhecido sem perder compatibilidade ou FPS', () => {
  const result = compareBuilds({
    builds: [
      { name: 'Com preco', components: valueBuild },
      { name: 'Preco pendente', components: { ...valueBuild, storageId: 'ssd-samsung-980-pro-1tb' } }
    ],
    budget: { amount: 10000 },
    gameId: 'game-cyberpunk-2077',
    comparisonCriteria: 'cost-benefit'
  });
  const unpriced = result.builds[1];
  assert.equal(unpriced.totalEstimatedPrice, null);
  assert.equal(unpriced.pricing.knownReferenceSubtotal, Number((currentBuildTotal() - currentPrice(currentBuild.storageId)).toFixed(2)));
  assert.equal(unpriced.pricing.referenceTotalComplete, false);
  assert.deepEqual(unpriced.pricing.componentsWithoutReference, ['ssd-samsung-980-pro-1tb']);
  assert.equal(unpriced.budgetStatus, 'unavailable');
  assert.equal(unpriced.costBenefitScore, null);
  assert.equal(unpriced.comparisonScore, null);
  assert.equal(unpriced.compatible, true);
  assert.ok(unpriced.gamePerformance.estimatedFps > 0);
  assert.equal(result.recommendedBuild.name, 'Com preco');
});

test('deve comparar mais de duas builds', () => {

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
