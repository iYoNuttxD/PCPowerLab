import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpgradeStepCount } from '../src/utils/validation.js';

test('upgrade steps match the visible 1–5 integer range', () => {
  for (const value of [1, 2, 3, 4, 5, '1', '5']) assert.equal(validateUpgradeStepCount(value), '');
  for (const value of ['', null, undefined, 0, -1, 0.5, 3.2, 5.5, 6, Infinity, NaN, 'invalid']) {
    assert.match(validateUpgradeStepCount(value), /entre 1 e 5/);
  }
});
