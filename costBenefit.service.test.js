import test from 'node:test';
import assert from 'node:assert/strict';

import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import {
  classifyCostBenefitScore,
  normalizeCostBenefitRatio
} from '../src/utils/costBenefitUtils.js';

test('deve listar componentes classificados por custo-beneficio', () => {
  const result = listComponentsByCostBenefit();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length > 0, true);

  const [firstItem] = result;

  assert.equal(typeof firstItem.component.id, 'string');
  assert.equal(typeof firstItem.performanceScore, 'number');
  assert.equal(typeof firstItem.costBenefitScore, 'number');
  assert.equal(typeof firstItem.classification, 'string');
  assert.equal(typeof firstItem.summary, 'string');
});

test('deve filtrar ranking de custo-beneficio por categoria', () => {
  const result = listComponentsByCostBenefit({ category: 'gpu' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((item) => item.component.category === 'gpu'), true);
});

test('deve limitar quantidade de resultados do ranking', () => {
  const result = listComponentsByCostBenefit({ category: 'cpu', limit: 5 });

  assert.equal(result.length, 5);
});

test('deve ordenar do melhor custo-beneficio para o pior dentro da categoria', () => {
  const result = listComponentsByCostBenefit({ category: 'cpu' });

  for (let index = 1; index < result.length; index += 1) {
    assert.equal(result[index - 1].costBenefitScore >= result[index].costBenefitScore, true);
  }
});

test('deve validar limite informado', () => {
  assert.throws(
    () => listComponentsByCostBenefit({ category: 'cpu', limit: 'abc' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Limite inválido.');
      return true;
    }
  );
});

test('deve classificar scores conforme faixas definidas', () => {
  assert.equal(classifyCostBenefitScore(90), 'Excelente');
  assert.equal(classifyCostBenefitScore(80), 'Muito bom');
  assert.equal(classifyCostBenefitScore(60), 'Bom');
  assert.equal(classifyCostBenefitScore(45), 'Regular');
  assert.equal(classifyCostBenefitScore(20), 'Baixo custo-benefício');
});

test('deve normalizar score bruto em escala de 0 a 100', () => {
  assert.equal(normalizeCostBenefitRatio(0.05, 0.1), 50);
  assert.equal(normalizeCostBenefitRatio(0.1, 0.1), 100);
});
