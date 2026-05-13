import test from 'node:test';
import assert from 'node:assert/strict';

import { createBudget } from '../src/services/budgetService.js';

test('deve estruturar um orcamento valido informado pelo usuario', () => {
  const budget = createBudget({
    amount: 5000,
    currency: 'BRL',
    priority: 'cost-benefit'
  });

  assert.deepEqual(budget, {
    amount: 5000,
    currency: 'BRL',
    priority: 'cost-benefit',
    warnings: []
  });
});

test('deve assumir moeda e prioridade padrao quando nao forem informadas', () => {
  const budget = createBudget({ amount: 3500 });

  assert.equal(budget.amount, 3500);
  assert.equal(budget.currency, 'BRL');
  assert.equal(budget.priority, 'balanced');
  assert.deepEqual(budget.warnings, []);
});

test('deve aceitar prioridades preparadas para recomendacoes futuras', () => {
  const budget = createBudget({
    amount: 8000,
    priority: 'upgrade-ready'
  });

  assert.equal(budget.priority, 'upgrade-ready');
});

test('deve retornar aviso para orcamento baixo, sem bloquear a entrada', () => {
  const budget = createBudget({ amount: 1200 });

  assert.equal(budget.warnings.length, 1);
  assert.equal(budget.warnings[0].includes('abaixo da faixa recomendada'), true);
});

test('deve retornar erro controlado quando orcamento nao for informado', () => {
  assert.throws(
    () => createBudget({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Valor de orcamento obrigatorio.');
      assert.equal(error.errors.some((message) => message.includes('amount')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando payload nao for informado', () => {
  assert.throws(
    () => createBudget(),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe o orcamento disponivel.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando orcamento for negativo', () => {
  assert.throws(
    () => createBudget({ amount: -500 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Valor de orcamento invalido.');
      assert.equal(error.errors.some((message) => message.includes('maior que zero')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando orcamento nao for numerico', () => {
  assert.throws(
    () => createBudget({ amount: '5000' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Valor de orcamento invalido.');
      assert.equal(error.errors.some((message) => message.includes('numero')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando orcamento estiver acima da faixa aceitavel', () => {
  assert.throws(
    () => createBudget({ amount: 100001 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Valor de orcamento fora da faixa aceitavel.');
      return true;
    }
  );
});