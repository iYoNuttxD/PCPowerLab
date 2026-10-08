import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalogResponse } from '../src/utils/catalogResponse.js';

test('empty catalog and valid current categories retain their transport meaning', () => {
  const data = [{ id: 'cpu-a', category: 'cpu' }, { id: 'fan-a', category: 'fan' }];
  assert.equal(validateCatalogResponse(data), data);
  assert.deepEqual(validateCatalogResponse([]), []);
});

test('invalid catalog shapes and entries surface errors instead of crash or false empty state', () => {
  for (const data of [null, {}, { success: true, data: null }, [null], ['cpu-a'], [{}], [{ id: 9, category: 'cpu' }], [{ id: 'cpu-a', category: 'unknown' }], [{ id: 'a', category: 'cpu' }, { id: 'a', category: 'gpu' }]]) {
    assert.throws(() => validateCatalogResponse(data), /Resposta inválida do catálogo/);
  }
});


test('catalog display fields reject object children and malformed specs without coercing unknown numbers', () => {
  const base = { id: 'cpu-a', category: 'cpu' };
  for (const extra of [{ name: {} }, { brand: {} }, { partNumber: [] }, { specSourceUrl: 8 }, { specs: [] }, { specs: { fanMounts: [null] } }]) {
    assert.throws(() => validateCatalogResponse([{ ...base, ...extra }]), /Resposta inválida/);
  }
  for (const price of [undefined, null, 'bad']) {
    assert.equal(validateCatalogResponse([{ ...base, price }])[0].price, price);
  }
});
