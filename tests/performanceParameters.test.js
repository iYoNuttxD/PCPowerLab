import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPerformanceParameters,
  deletePerformanceParameters,
  findPerformanceParametersByComponentId,
  listPerformanceParameters,
  updatePerformanceParameters
} from '../src/services/performanceParametersService.js';

test('deve listar todos os parametros de desempenho cadastrados', () => {
  const result = listPerformanceParameters();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length > 0, true);
});

test('deve filtrar parametros de desempenho por type', () => {
  const result = listPerformanceParameters({ type: 'GPU' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((parameter) => parameter.type === 'gpu'), true);
});

test('deve consultar parametros de desempenho por componentId', () => {
  const result = findPerformanceParametersByComponentId('gpu-rtx-4060');

  assert.equal(result.componentId, 'gpu-rtx-4060');
  assert.equal(result.type, 'gpu');
});

test('deve cadastrar parametros para um componente existente', () => {
  const result = createPerformanceParameters({
    componentId: 'gpu-rx-7600',
    type: 'gpu',
    performanceScore: 83,
    gamingScore: 86,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    tdp: 165,
    recommendedUse: ['gaming', 'general']
  });

  assert.equal(result.componentId, 'gpu-rx-7600');
  assert.equal(result.type, 'gpu');
  assert.equal(result.performanceScore, 83);
});

test('deve impedir duplicacao de parametros para o mesmo componente', () => {
  assert.throws(
    () => createPerformanceParameters({
      componentId: 'gpu-rtx-4060',
      type: 'gpu',
      performanceScore: 90
    }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.message.includes('Ja existem parametros'), true);
      return true;
    }
  );
});

test('deve atualizar parametros de desempenho de um componente', () => {
  const result = updatePerformanceParameters('cpu-ryzen-5-5600', {
    performanceScore: 80,
    gamingScore: 79,
    recommendedUse: ['gaming', 'general', 'productivity']
  });

  assert.equal(result.componentId, 'cpu-ryzen-5-5600');
  assert.equal(result.performanceScore, 80);
  assert.equal(result.gamingScore, 79);
});

test('deve remover parametros de desempenho quando existir', () => {
  const result = deletePerformanceParameters('psu-corsair-650w');

  assert.equal(result.componentId, 'psu-corsair-650w');
  assert.equal(findPerformanceParametersByComponentId('psu-corsair-650w'), null);
});

test('deve retornar erro controlado para componente inexistente', () => {
  assert.throws(
    () => createPerformanceParameters({
      componentId: 'gpu-inexistente',
      type: 'gpu',
      performanceScore: 80
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Componente informado nao existe.');
      return true;
    }
  );
});

test('deve validar performanceScore numerico e na escala de 0 a 100', () => {
  assert.throws(
    () => createPerformanceParameters({
      componentId: 'cpu-intel-i5-12400f',
      type: 'cpu',
      performanceScore: 120
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.includes('performanceScore deve estar na escala de 0 a 100.'), true);
      return true;
    }
  );
});

test('deve validar se o type corresponde ao tipo real do componente', () => {
  assert.throws(
    () => createPerformanceParameters({
      componentId: 'cpu-intel-i5-12400f',
      type: 'gpu',
      performanceScore: 70
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo informado nao corresponde ao tipo do componente.');
      return true;
    }
  );
});
