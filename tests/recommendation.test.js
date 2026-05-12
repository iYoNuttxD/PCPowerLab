import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendBuildByBudget } from '../src/services/recommendationService.js';

test('deve gerar recomendacao completa dentro do orcamento informado', () => {
  const recommendation = recommendBuildByBudget({
    budget: {
      amount: 5000,
      currency: 'BRL',
      priority: 'cost-benefit'
    },
    usageType: 'gaming'
  });

  assert.equal(recommendation.usageType, 'gaming');
  assert.equal(recommendation.priority, 'cost-benefit');
  assert.equal(recommendation.totalEstimatedPrice <= 5000, true);
  assert.equal(recommendation.remainingBudget, Number((5000 - recommendation.totalEstimatedPrice).toFixed(2)));

  for (const slot of ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case']) {
    assert.equal(recommendation.components[slot].category, slot);
  }
});

test('deve evitar componentes incompativeis na recomendacao', () => {
  const recommendation = recommendBuildByBudget({
    budget: {
      amount: 5000,
      priority: 'performance'
    },
    usageType: 'gaming'
  });

  assert.equal(recommendation.components.cpu.specs.socket, recommendation.components.motherboard.specs.socket);
  assert.equal(
    recommendation.components.ram.specs.memoryType,
    recommendation.components.motherboard.specs.memoryType
  );
  assert.equal(recommendation.warnings.length, 0);
});

test('deve retornar erro controlado quando orcamento nao for informado', () => {
  assert.throws(
    () => recommendBuildByBudget({ usageType: 'gaming' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Orcamento obrigatorio.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando nao couber no orcamento', () => {
  assert.throws(
    () => recommendBuildByBudget({
      budget: {
        amount: 1000
      },
      usageType: 'general'
    }),
    (error) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.message.includes('dentro do orcamento informado'), true);
      return true;
    }
  );
});
