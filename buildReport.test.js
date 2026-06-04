import test from 'node:test';
import assert from 'node:assert/strict';

import { generateBuildReport } from '../src/services/buildReportService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve gerar relatorio tecnico estruturado de uma build', () => {
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
  assert.equal(report.components.cpu.id, validBuild.cpuId);
  assert.equal(report.pricing.totalEstimatedPrice, 4699.3);
  assert.equal(report.pricing.budget, 5000);
  assert.equal(report.pricing.remaining, 300.7);
  assert.equal(report.pricing.status, 'within_budget');
  assert.equal(report.compatibility.compatible, true);
  assert.deepEqual(report.alerts, []);
  assert.equal(report.bottlenecks.hasBottleneck, false);
  assert.equal(report.gamePerformance.length, 2);
  assert.equal(report.score.overallScore >= 0, true);
  assert.equal(report.purchaseLinks.cpu.length > 0, true);
  assert.equal(report.summary.includes('Nota geral'), true);
});

test('deve funcionar sem orcamento, sem jogos e sem links de compra', () => {
  const report = generateBuildReport({
    build: validBuild,
    includePurchaseLinks: false
  });

  assert.equal(report.pricing.status, 'not_provided');
  assert.equal(report.pricing.budget, null);
  assert.deepEqual(report.gamePerformance, []);
  assert.equal(report.purchaseLinks, undefined);
  assert.equal(report.score.overallScore >= 0, true);
  assert.equal(typeof report.summary, 'string');
});

test('deve retornar secao indisponivel quando uma simulacao parcial falhar', () => {
  const report = generateBuildReport({
    build: validBuild,
    gameIds: ['game-inexistente']
  });

  assert.equal(report.gamePerformance.length, 1);
  assert.equal(report.gamePerformance[0].available, false);
  assert.equal(report.gamePerformance[0].gameId, 'game-inexistente');
  assert.equal(report.gamePerformance[0].errors.some((message) => message.includes('Jogo')), true);
});

test('deve exigir build para gerar o relatorio tecnico', () => {
  assert.throws(
    () => generateBuildReport({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para gerar o relatorio tecnico da configuracao.');
      return true;
    }
  );
});
