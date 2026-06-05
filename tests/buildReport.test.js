import test from 'node:test';
import assert from 'node:assert/strict';

import { generateBuildReport } from '../src/services/buildReportService.js';
import { buildReportRoutes } from '../src/routes/buildReport.routes.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  gpuId: 'gpu-rtx-4060',
  motherboardId: 'mb-b550m-aorus-elite',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve gerar relatorio tecnico estruturado da configuracao', () => {
  const report = generateBuildReport({
    build: validBuild,
    budget: {
      amount: 5000,
      currency: 'BRL'
    },
    usageType: 'gaming',
    gameIds: ['game-counter-strike-2', 'game-cyberpunk-2077'],
    includePurchaseLinks: true
  });

  assert.equal(typeof report.metadata.generatedAt, 'string');
  assert.equal(report.metadata.usageType, 'gaming');
  assert.equal(report.metadata.currency, 'BRL');
  assert.equal(report.components.cpu.id, 'cpu-ryzen-5-5600');
  assert.equal(report.pricing.budget, 5000);
  assert.equal(typeof report.pricing.totalEstimatedPrice, 'number');
  assert.equal(['within_budget', 'near_budget', 'over_budget'].includes(report.pricing.status), true);
  assert.equal(typeof report.compatibility.compatible, 'boolean');
  assert.equal(Array.isArray(report.alerts), true);
  assert.equal(typeof report.bottlenecks, 'object');
  assert.equal(report.gamePerformance.length, 2);
  assert.equal(typeof report.score.overallScore, 'number');
  assert.equal(Array.isArray(report.purchaseLinks.cpu), true);
  assert.equal(typeof report.summary, 'string');
  assert.equal(typeof report.recommendations.finalRecommendation, 'string');
});

test('deve gerar relatorio mesmo sem orcamento e sem jogos', () => {
  const report = generateBuildReport({
    build: validBuild,
    usageType: 'general'
  });

  assert.equal(report.pricing.budget, null);
  assert.equal(report.pricing.remaining, null);
  assert.equal(report.pricing.status, 'budget_not_informed');
  assert.deepEqual(report.gamePerformance, []);
  assert.equal(report.purchaseLinks, undefined);
  assert.equal(typeof report.summary, 'string');
});

test('deve omitir links de compra quando includePurchaseLinks for false', () => {
  const report = generateBuildReport({
    build: validBuild,
    includePurchaseLinks: false
  });

  assert.equal(report.purchaseLinks, undefined);
});

test('deve retornar simulacao indisponivel para jogo invalido sem quebrar o relatorio', () => {
  const report = generateBuildReport({
    build: validBuild,
    gameIds: ['game-inexistente']
  });

  assert.equal(report.gamePerformance[0].available, false);
  assert.equal(report.gamePerformance[0].gameId, 'game-inexistente');
  assert.equal(Array.isArray(report.gamePerformance[0].errors), true);
});

test('deve exigir build para gerar relatorio tecnico', () => {
  assert.throws(
    () => generateBuildReport({ usageType: 'gaming' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para gerar o relatorio tecnico da configuracao.');
      return true;
    }
  );
});

test('deve expor rota POST de relatorio tecnico', () => {
  const paths = buildReportRoutes.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

  assert.equal(paths.includes('POST /'), true);
});
