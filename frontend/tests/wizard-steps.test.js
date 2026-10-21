import test from 'node:test';
import assert from 'node:assert/strict';
import { hasWizardCompatibilityBlockers, normalizeWizardStep, optionalWizardSteps, requiredWizardSteps, wizardDescriptions, wizardSteps } from '../src/utils/wizardSteps.js';

test('wizard starts with budget and use, preserves nine required steps and optional cooling', () => {
  assert.deepEqual(wizardSteps, ['budget', 'cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling', 'review']);
  assert.deepEqual(optionalWizardSteps, ['cooling']);
  assert.deepEqual(requiredWizardSteps, ['budget', 'cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'review']);
  for (const step of wizardSteps) {
    assert.equal(normalizeWizardStep(step), step);
    assert.ok(wizardDescriptions[step].length > 30);
  }
  for (const invalid of ['', null, 'cooler', 'fans', 'missing']) assert.equal(normalizeWizardStep(invalid), 'budget');
});

test('wizard allows manual review with unknown compatibility', () => {
  for (const pending of [undefined, null, {}, { compatible: false }, { compatible: true, status: 'unverified' }, { compatible: true, status: 'incompatible' }]) {
    assert.equal(hasWizardCompatibilityBlockers(pending, { compatible: true }), false);
  }
  assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, { compatible: true }), false);
});

test('wizard never turns factual alerts into manual progression gates', () => {
  for (const key of ['alerts', 'violations', 'issues']) {
    for (const issue of [{ severity: 'high' }, { severity: 'critical' }, { severity: 'low', blocking: true }]) {
      const result = { compatible: true, [key]: [issue] };
      assert.equal(hasWizardCompatibilityBlockers(result, { compatible: true }), false);
      assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, result), false);
    }
  }
  for (const result of [{ compatible: false }, { compatible: true, status: 'unverified' }, { compatible: true, status: 'incompatible' }]) {
    assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, result), false);
  }
});

test('ordinary warnings and malformed optional issue collections do not become blockers', () => {
  assert.equal(hasWizardCompatibilityBlockers({ compatible: true, alerts: [{ severity: 'medium', blocking: false }, null] }, { alerts: 'not an array', violations: {}, issues: null }), false);
});
