import test from 'node:test';
import assert from 'node:assert/strict';

import { listComponentsByCostBenefit } from '../src/services/costBenefitService.js';
import { componentRoutes } from '../src/routes/component.routes.js';


test('deve listar componentes classificados por custo-beneficio', () => {
  const ranking = listComponentsByCostBenefit();

  assert.equal(Array.isArray(ranking), true);
  assert.equal(ranking.length > 0, true);
  assert.equal(ranking[0].costBenefitScore >= ranking[1].costBenefitScore, true);
  assert.equal(typeof ranking[0].classification, 'string');
  assert.equal(typeof ranking[0].summary, 'string');
});

test('deve filtrar ranking de custo-beneficio por categoria', () => {
  const ranking = listComponentsByCostBenefit({ category: 'gpu' });

  assert.equal(ranking.length > 0, true);
  assert.equal(ranking.every((entry) => entry.component.category === 'gpu'), true);
});

test('deve limitar quantidade de resultados do ranking', () => {
  const ranking = listComponentsByCostBenefit({ category: 'cpu', limit: '5' });

  assert.equal(ranking.length, 5);
  assert.equal(ranking.every((entry) => entry.component.category === 'cpu'), true);
});

test('deve rejeitar limit invalido', () => {
  assert.throws(
    () => listComponentsByCostBenefit({ limit: 'abc' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Limit invalido.');
      return true;
    }
  );
});

test('deve expor endpoint de classificacao por custo-beneficio em components', () => {
  const paths = componentRoutes.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

  assert.equal(paths.includes('GET /cost-benefit'), true);
});
