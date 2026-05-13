import test from 'node:test';
import assert from 'node:assert/strict';

import { generateExplanation } from '../src/services/explanationService.js';

test('deve gerar explicacao simples para incompatibilidade', () => {
  const explanation = generateExplanation({
    type: 'incompatibility',
    data: {
      code: 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE',
      severity: 'high'
    }
  });

  assert.equal(explanation.title, 'Processador incompativel com a placa-mae');
  assert.equal(explanation.simpleExplanation.includes('socket'), true);
  assert.equal(explanation.suggestion.includes('placa-mae'), true);
  assert.equal(explanation.severity, 'high');
});

test('deve gerar explicacao simples para gargalo', () => {
  const explanation = generateExplanation({
    type: 'bottleneck',
    data: {
      type: 'cpu_bottleneck',
      severity: 'medium',
      component: 'cpu',
      relatedComponent: 'gpu',
      cpuScore: 60,
      gpuScore: 85
    }
  });

  assert.equal(explanation.title, 'Possivel gargalo no processador');
  assert.equal(explanation.simpleExplanation.includes('processador pode limitar'), true);
  assert.equal(explanation.suggestion.includes('processador mais forte'), true);
  assert.equal(explanation.severity, 'medium');
});

test('deve gerar explicacao simples para recomendacao', () => {
  const explanation = generateExplanation({
    type: 'recommendation',
    data: {
      component: 'gpu',
      priority: 'cost-benefit',
      usageType: 'gaming'
    }
  });

  assert.equal(explanation.title, 'Boa escolha para custo-beneficio');
  assert.equal(explanation.simpleExplanation.includes('custo-beneficio'), true);
  assert.equal(explanation.suggestion.includes('1080p'), true);
  assert.equal(explanation.severity, 'medium');
});

test('deve gerar explicacao simples para simulacao de desempenho', () => {
  const explanation = generateExplanation({
    type: 'performance',
    data: {
      performanceScore: 82,
      usageType: 'gaming'
    }
  });

  assert.equal(explanation.title, 'Desempenho esperado alto');
  assert.equal(explanation.simpleExplanation.includes('jogos'), true);
  assert.equal(explanation.suggestion.includes('estabilidade'), true);
  assert.equal(explanation.severity, 'low');
});

test('deve gerar explicacao simples para orcamento dentro do limite', () => {
  const explanation = generateExplanation({
    type: 'budget',
    data: {
      budgetAmount: 5000,
      totalEstimatedPrice: 4300,
      remainingBudget: 700
    }
  });

  assert.equal(explanation.title, 'Configuracao dentro do orcamento');
  assert.equal(explanation.simpleExplanation.includes('abaixo do valor maximo'), true);
  assert.equal(explanation.suggestion.includes('armazenamento'), true);
  assert.equal(explanation.severity, 'low');
});

test('deve gerar explicacao simples para orcamento acima do limite', () => {
  const explanation = generateExplanation({
    type: 'budget',
    data: {
      budgetAmount: 5000,
      totalEstimatedPrice: 5300
    }
  });

  assert.equal(explanation.title, 'Configuracao acima do orcamento');
  assert.equal(explanation.severity, 'high');
});

test('deve gerar explicacao simples para aviso geral', () => {
  const explanation = generateExplanation({
    type: 'general',
    data: {
      title: 'Preco pode variar',
      message: 'Os precos usados sao estimativas e podem mudar conforme a loja.',
      suggestion: 'Confira o valor final antes da compra.'
    }
  });

  assert.equal(explanation.title, 'Preco pode variar');
  assert.equal(explanation.simpleExplanation.includes('estimativas'), true);
  assert.equal(explanation.suggestion.includes('valor final'), true);
  assert.equal(explanation.severity, 'low');
});

test('deve retornar erro controlado quando tipo nao for informado', () => {
  assert.throws(
    () => generateExplanation({ data: {} }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo de explicacao obrigatorio.');
      return true;
    }
  );
});

test('deve retornar erro controlado para tipo invalido', () => {
  assert.throws(
    () => generateExplanation({ type: 'unknown', data: {} }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo de explicacao invalido.');
      assert.equal(error.errors.some((message) => message.includes('bottleneck')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para severidade invalida', () => {
  assert.throws(
    () => generateExplanation({
      type: 'bottleneck',
      data: {
        type: 'cpu_bottleneck',
        severity: 'critical'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Severidade invalida.');
      return true;
    }
  );
});