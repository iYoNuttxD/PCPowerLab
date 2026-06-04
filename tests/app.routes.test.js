import test from 'node:test';
import assert from 'node:assert/strict';

import { app } from '../src/app.js';
import { compatibilityRoutes } from '../src/routes/compatibility.routes.js';
import { compatibilityFixRoutes } from '../src/routes/compatibilityFix.routes.js';
import { compatibilityRuleRoutes } from '../src/routes/compatibility-rule.routes.js';
import { gamePerformanceRoutes } from '../src/routes/gamePerformance.routes.js';
import { recommendationRoutes } from '../src/routes/recommendation.routes.js';
import { buildScoreRoutes } from '../src/routes/buildScore.routes.js';
import { fail } from '../src/utils/api-response.js';

test('deve registrar rotas principais no app Express', () => {
  const registeredRouters = app._router.stack.filter((layer) => layer.name === 'router');

  assert.equal(registeredRouters.length >= 18, true);
});

test('deve expor endpoints padronizados de compatibilidade', () => {
  const compatibilityPaths = getRoutePaths(compatibilityRoutes);

  assert.equal(compatibilityPaths.includes('POST /check'), true);
  assert.equal(compatibilityPaths.includes('POST /alerts'), true);
});

test('deve expor endpoint de sugestoes de correcao de compatibilidade', () => {
  const compatibilityFixPaths = getRoutePaths(compatibilityFixRoutes);

  assert.equal(compatibilityFixPaths.includes('POST /fix-suggestions'), true);
});

test('deve expor manutencao completa de regras de compatibilidade', () => {
  const rulePaths = getRoutePaths(compatibilityRuleRoutes);

  assert.equal(rulePaths.includes('GET /'), true);
  assert.equal(rulePaths.includes('POST /'), true);
  assert.equal(rulePaths.includes('PUT /:id'), true);
  assert.equal(rulePaths.includes('DELETE /:id'), true);
});

test('deve expor endpoint de recomendacao de builds por faixa de orcamento', () => {
  const recommendationPaths = getRoutePaths(recommendationRoutes);

  assert.equal(recommendationPaths.includes('POST /builds-by-budget-range'), true);
});

test('deve expor endpoint de nota geral da build', () => {
  const scorePaths = getRoutePaths(buildScoreRoutes);

  assert.equal(scorePaths.includes('POST /'), true);
});

test('deve expor endpoint de comparacao de desempenho entre jogos', () => {
  const performancePaths = getRoutePaths(gamePerformanceRoutes);

  assert.equal(performancePaths.includes('POST /compare-games'), true);
});

test('deve manter resposta de erro sem campo data', () => {
  const response = createMockResponse();

  fail(response, 400, 'Entrada invalida.', ['Campo obrigatorio ausente.']);

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Entrada invalida.',
    errors: ['Campo obrigatorio ausente.']
  });
});

function getRoutePaths(router) {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .map((method) => `${method.toUpperCase()} ${layer.route.path}`));
}

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;

      return this;
    },
    json(body) {
      this.body = body;

      return this;
    }
  };
}
