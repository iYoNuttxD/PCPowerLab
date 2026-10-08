import test from 'node:test';
import assert from 'node:assert/strict';
import { numericValue, formatPerformanceNumber, formatRequirement } from '../src/utils/performancePresentation.js';

test('missing and malformed chart values never become numeric zero', () => {
  for (const value of [undefined, null, '', ' ', '\n\t', false, true, [], [25], {}, NaN, Infinity, -Infinity, 'not a number']) {
    assert.equal(numericValue(value), null, `Rejected value: ${String(value)}`);
    assert.equal(formatPerformanceNumber(value), 'Não disponível');
  }
});

test('genuine zero, finite numbers and numeric API strings remain available', () => {
  for (const value of [0, '0', ' 0 ']) {
    assert.equal(numericValue(value), 0);
    assert.equal(formatPerformanceNumber(value), '0');
  }
  assert.equal(numericValue('72.5'), 72.5);
  assert.equal(formatPerformanceNumber(72.5), '72,5');
  assert.equal(numericValue(-5), -5, 'signed technical differences are still numbers');
});

test('unknown requirements stay distinct from a failed requirement', () => {
  assert.equal(formatRequirement(true), 'Sim');
  assert.equal(formatRequirement(false), 'Não');
  for (const value of [undefined, null, 0, 1, 'true', 'false']) assert.equal(formatRequirement(value), 'Não informado');
});
