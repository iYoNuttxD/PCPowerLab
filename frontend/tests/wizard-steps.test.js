import test from 'node:test';
import assert from 'node:assert/strict';
import { hasWizardCompatibilityBlockers, normalizeWizardStep, wizardDescriptions, wizardSteps } from '../src/utils/wizardSteps.js';

test('wizard preserves its nine ordered steps and explains every step', () => {
  assert.deepEqual(wizardSteps, ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'budget', 'review']);
  for (const step of wizardSteps) {
    assert.equal(normalizeWizardStep(step), step);
    assert.ok(wizardDescriptions[step].length > 30);
  }
  for (const invalid of ['', null, 'cooler', 'fans', 'missing']) assert.equal(normalizeWizardStep(invalid), 'cpu');
});

test('wizard requires a confirmed compatibility result before marking review complete', () => {
  for (const pending of [undefined, null, {}, { compatible: false }, { compatible: true, status: 'unverified' }, { compatible: true, status: 'incompatible' }]) {
    assert.equal(hasWizardCompatibilityBlockers(pending, { compatible: true }), true);
  }
  assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, { compatible: true }), false);
});

test('wizard does not let a success flag override critical issues from either endpoint', () => {
  for (const key of ['alerts', 'violations', 'issues']) {
    for (const issue of [{ severity: 'high' }, { severity: 'critical' }, { severity: 'low', blocking: true }]) {
      const result = { compatible: true, [key]: [issue] };
      assert.equal(hasWizardCompatibilityBlockers(result, { compatible: true }), true);
      assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, result), true);
    }
  }
  for (const result of [{ compatible: false }, { compatible: true, status: 'unverified' }, { compatible: true, status: 'incompatible' }]) {
    assert.equal(hasWizardCompatibilityBlockers({ compatible: true }, result), true);
  }
});

test('ordinary warnings and malformed optional issue collections do not become blockers', () => {
  assert.equal(hasWizardCompatibilityBlockers({ compatible: true, alerts: [{ severity: 'medium', blocking: false }, null] }, { alerts: 'not an array', violations: {}, issues: null }), false);
});
