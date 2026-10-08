import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { createAdminComponent, findAdminComponentById, updateAdminComponent } from '../src/services/admin-component.service.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { recommendBuildByBudget, recommendBuildsByBudgetRange } from '../src/services/recommendationService.js';
import { suggestCompatibilityFixes } from '../src/services/compatibilityFixService.js';

const build = { cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite', gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4', storageId: 'ssd-kingston-nv2-1tb', psuId: 'psu-corsair-650w', caseId: 'case-mid-tower-airflow' };
const recommendation = { budget: { amount: 5000, priority: 'cost-benefit' }, usageType: 'gaming' };

for (const [id, field] of [[build.motherboardId, 'storageInterfaces'], [build.caseId, 'supportedFormFactors']]) {
  test(`admin rejects malformed ${field} atomically`, () => {
    const original = JSON.parse(JSON.stringify(findAdminComponentById(id)));
    try {
      for (const value of [42, {}, 'SATA', [42], [''], [], [original.specs[field][0], 42]]) {
        assert.throws(() => updateAdminComponent(id, { [field]: value }), { statusCode: 400 });
        assert.deepEqual(findAdminComponentById(id), original);
      }
    } finally {
      // Also restore when exercising the uncorrected source as a negative control.
      const index = components.findIndex(component => component.id === id);
      components[index] = original;
    }
  });
}

test('missing optional storage interfaces stay unverified; missing required case formats are rejected', () => {
  const board = createAdminComponent({ id: 'mb-core-array-missing', type: 'motherboard', name: 'Board with unknown interfaces',
    price: 600, socket: 'AM4', memoryType: 'DDR4', formFactor: 'mATX', chipset: 'B550' });
  const result = checkBuildCompatibility({ ...build, motherboardId: board.id });
  assert.equal(result.status, 'unverified');
  assert.ok(result.unverifiedChecks.some(check => check.code === 'STORAGE_INTERFACE_UNVERIFIED'));
  assert.throws(() => createAdminComponent({ id: 'case-core-array-missing', type: 'case', name: 'Case without formats',
    price: 200, maxGpuLengthMm: 320 }), { statusCode: 400 });
});

for (const [category, field, id, code] of [
  ['motherboard', 'storageInterfaces', build.motherboardId, 'STORAGE_INTERFACE_UNVERIFIED'],
  ['case', 'supportedFormFactors', build.caseId, 'CASE_FORM_FACTOR_UNVERIFIED']
]) {
  test(`legacy missing or malformed ${field} cannot approve compatibility or crash recommendations`, () => {
    const records = components.filter(component => component.category === category);
    const originals = records.map(component => component.specs[field]);
    try {
      for (const value of [undefined, 42, [originals[0]?.[0], 42]]) {
        records.forEach(component => { component.specs[field] = value; });
        const result = checkBuildCompatibility({ ...build, [`${category}Id`]: id });
        assert.equal(result.status, 'unverified');
        assert.ok(result.unverifiedChecks.some(check => check.code === code));
        assert.throws(() => recommendBuildByBudget(recommendation), { statusCode: 422 });
        assert.throws(() => recommendBuildsByBudgetRange({ budgetRange: { min: 2000, max: 5000 }, usageType: 'gaming' }), { statusCode: 422 });
      }
    } finally {
      records.forEach((component, index) => { component.specs[field] = originals[index]; });
    }
  });
}

test('a malformed legacy candidate is skipped while healthy recommendations and fixes remain usable', () => {
  const board = components.find(component => component.id === build.motherboardId);
  const malformedCase = components.find(component => component.id === build.caseId);
  const originalInterfaces = board.specs.storageInterfaces;
  const originalFormats = malformedCase.specs.supportedFormFactors;
  try {
    board.specs.storageInterfaces = 42;
    malformedCase.specs.supportedFormFactors = 42;
    const result = recommendBuildByBudget(recommendation);
    assert.notEqual(result.components.motherboard.id, board.id);
    assert.notEqual(result.components.case.id, malformedCase.id);
    assert.equal(checkBuildCompatibility(Object.fromEntries(Object.entries(result.components).map(([slot, component]) => [slot, component.id]))).status, 'compatible');
    const fixes = suggestCompatibilityFixes({ ...build, motherboardId: 'mb-msi-b550-tomahawk', caseId: 'case-compact-matx' });
    assert.ok(fixes.issues.some(issue => issue.type === 'case_form_factor_mismatch'));
    assert.ok(fixes.suggestions.length > 0);
    assert.ok(fixes.suggestions.every(suggestion => suggestion.suggestedComponents.every(({ component }) => component.id !== malformedCase.id)));
  } finally {
    board.specs.storageInterfaces = originalInterfaces;
    malformedCase.specs.supportedFormFactors = originalFormats;
  }
});
