import test from 'node:test';
import assert from 'node:assert/strict';

import { recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';

test('deve recomendar build completa por faixa de orcamento', () => {
  const recommendations = recommendBuildsByBudgetRange({
    budgetRange: {
      min: 3500,
      max: 10000
    },
    usageType: 'gaming',
    priority: 'cost-benefit'
  });

  assert.equal(Array.isArray(recommendations), true);
  assert.equal(recommendations.length > 0, true);

  const recommendation = recommendations[0];

  assert.equal(recommendation.usageType, 'gaming');
  assert.equal(recommendation.priority, 'cost-benefit');
  assert.equal(recommendation.budgetStatus, 'within_range');
  assert.equal(recommendation.compatibilityStatus, 'compatible');
  assert.equal(recommendation.totalEstimatedPrice >= 3500, true);
  assert.equal(recommendation.totalEstimatedPrice <= 10000, true);
  assert.equal(typeof recommendation.summary, 'string');
  assert.equal(typeof recommendation.estimatedPerformanceLevel, 'string');

  for (const slot of ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case']) {
    assert.equal(recommendation.components[slot].category, slot);
  }
});

test('deve manter compatibilidade entre componentes recomendados na faixa', () => {
  const [recommendation] = recommendBuildsByBudgetRange({
    budgetRange: {
      min: 3500,
      max: 10000
    },
    usageType: 'gaming',
    priority: 'performance'
  });

  assert.equal(recommendation.components.cpu.specs.socket, recommendation.components.motherboard.specs.socket);
  assert.equal(
    recommendation.components.ram.specs.memoryType,
    recommendation.components.motherboard.specs.memoryType
  );
  assert.equal(recommendation.compatibilityStatus, 'compatible');
});

test('deve aplicar fallback de prioridade invalida para recomendacao por faixa', () => {
  const [recommendation] = recommendBuildsByBudgetRange({
    budgetRange: {
      min: 3500,
      max: 10000
    },
    usageType: 'gaming',
    priority: 'prioridade-inexistente'
  });

  assert.equal(recommendation.priority, 'cost-benefit');
});

test('deve retornar erro controlado para faixa de orcamento ausente', () => {
  assert.throws(
    () => recommendBuildsByBudgetRange({
      usageType: 'gaming',
      priority: 'cost-benefit'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Faixa de orcamento obrigatoria.');
      return true;
    }
  );
});

test('deve retornar erro controlado para min maior ou igual ao max', () => {
  assert.throws(
    () => recommendBuildsByBudgetRange({
      budgetRange: {
        min: 10000,
        max: 3500
      },
      usageType: 'gaming'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Faixa de orcamento invalida.');
      assert.equal(error.errors[0], 'budgetRange.min deve ser menor que budgetRange.max.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando nao houver build completa dentro da faixa', () => {
  assert.throws(
    () => recommendBuildsByBudgetRange({
      budgetRange: {
        min: 100,
        max: 500
      },
      usageType: 'general'
    }),
    (error) => {
      assert.equal(error.statusCode, 422);
      assert.equal(error.message.includes('faixa de orcamento informada'), true);
      return true;
    }
  );
});
