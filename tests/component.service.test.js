import test from 'node:test';
import assert from 'node:assert/strict';

import { findComponentById, listComponents } from '../src/services/component.service.js';

test('deve listar todos os componentes disponíveis', () => {
  const result = listComponents();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length > 0, true);
});

test('deve filtrar componentes por type', () => {
  const result = listComponents({ type: 'cpu' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((component) => component.category === 'cpu'), true);
});

test('deve aceitar type com letras maiúsculas e espaços', () => {
  const result = listComponents({ type: ' CPU ' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((component) => component.category === 'cpu'), true);
});

test('deve manter compatibilidade com filtro category', () => {
  const result = listComponents({ category: 'gpu' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((component) => component.category === 'gpu'), true);
});

test('deve lançar erro controlado quando a categoria não existir', () => {
  assert.throws(
    () => listComponents({ type: 'monitor' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Categoria de componente inválida.');
      assert.equal(error.errors[0].includes('cpu, gpu, motherboard, ram, storage, psu, case'), true);
      return true;
    }
  );
});

test('deve retornar componente pelo ID existente', () => {
  const result = findComponentById('cpu-ryzen-5-5600');

  assert.equal(result.id, 'cpu-ryzen-5-5600');
  assert.equal(result.category, 'cpu');
});

test('deve retornar null para ID inexistente', () => {
  const result = findComponentById('component-inexistente');

  assert.equal(result, null);
});
