import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendBuildByBudget } from '../src/services/recommendationService.js';

test('deve gerar recomendacao por uso programming respeitando o orcamento', () => {
  const recommendation = recommendBuildByBudget({
    budget: {
      amount: 6000,
      currency: 'BRL',
      priority: 'cost-benefit'
    },
    usageType: 'programming'
  });

  assert.equal(recommendation.usageType, 'programming');
  assert.equal(recommendation.priority, 'cost-benefit');
  assert.equal(recommendation.totalEstimatedPrice <= 6000, true);
  assert.equal(typeof recommendation.strategy, 'string');
  assert.equal(typeof recommendation.summary, 'string');
});

test('deve gerar recomendacao por uso work e incluir estrategia de workload', () => {
  const recommendation = recommendBuildByBudget({
    budget: {
      amount: 6000,
      priority: 'performance'
    },
    usageType: 'work'
  });

  assert.equal(recommendation.usageType, 'work');
  assert.equal(recommendation.strategy.includes('CPU'), true);
  assert.equal(recommendation.components.cpu.category, 'cpu');
  assert.equal(recommendation.components.gpu.category, 'gpu');
});

test('deve gerar recomendacao por uso general', () => {
  const recommendation = recommendBuildByBudget({
    budget: {
      amount: 10000,
      priority: 'cost-benefit'
    },
    usageType: 'general'
  });

  assert.equal(recommendation.usageType, 'general');
  assert.equal(recommendation.summary.includes('uso geral'), true);
});

test('deve retornar erro controlado para usageType invalido', () => {
  assert.throws(
    () => recommendBuildByBudget({
      budget: {
        amount: 10000
      },
      usageType: 'invalid-usage'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo de uso invalido.');
      assert.equal(error.errors[0].includes('Tipos aceitos'), true);
      return true;
    }
  );
});
