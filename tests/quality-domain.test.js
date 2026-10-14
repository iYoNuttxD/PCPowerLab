import test from 'node:test';
import assert from 'node:assert/strict';
import { components } from '../src/data/components.mock.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { compatibilityRules } from '../src/data/compatibility-rules.mock.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { compareBuilds } from '../src/services/buildComparisonService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { simulateGamePerformance, compareGamePerformance } from '../src/services/gamePerformanceService.js';
import { simulateProfessionalSoftwarePerformance } from '../src/services/professionalSoftwareService.js';
import { updatePerformanceParameters, findPerformanceParametersByComponentId } from '../src/services/performanceParametersService.js';
import { selectBuildComponents, serializeBuildSelection } from '../src/services/build.service.js';

const legacy = readyBuilds[0].components;
const game = (build) => simulateGamePerformance({ gameId: 'game-valorant', build });
const games = (build) => compareGamePerformance({ gameIds: ['game-valorant', 'game-cyberpunk-2077'], build });
const software = (build) => simulateProfessionalSoftwarePerformance({ softwareId: 'software-adobe-premiere-pro', build });

for (const [name, simulate] of [['game', game], ['multiple games', games], ['professional software', software]]) {
  test(`${name}: rejects full incompatible and unknown builds instead of returning unsupported performance`, () => {
    // Select an actual mismatched socket, so this tests compatibility rather than a missing ID.
    const motherboardId = components.find(part => part.category === 'motherboard' && part.specs.socket !== selectBuildComponents(legacy).cpu.specs.socket).id;
    const incompatible = { ...legacy, motherboardId };
    assert.equal(checkBuildCompatibility(incompatible).status, 'incompatible');
    assert.throws(() => simulate(incompatible), { statusCode: 422 });
    const unknown = { ...legacy, coolerId: components.find(part => part.category === 'cooler').id };
    assert.equal(checkBuildCompatibility(unknown).status, 'unverified');
    assert.throws(() => simulate({ components: unknown }), { statusCode: 422 });
    const removed = simulate({ components: unknown, coolerId: null });
    assert.equal((removed.technicalDetails?.compatibility ?? removed.compatibility).status, 'compatible');
    const valid = simulate(legacy);
    assert.equal((valid.technicalDetails?.compatibility ?? valid.compatibility).status, 'compatible');
  });

  test(`${name}: top-level component aliases override conflicting nested IDs consistently`, () => {
    const conflicting = { components: { ...legacy, cpuId: 'cpu-intel-i3-12100f' }, cpu: legacy.cpuId };
    assert.equal(selectBuildComponents(conflicting).cpu.id, legacy.cpuId);
    assert.deepEqual(simulate(conflicting), simulate(legacy));
  });

  test(`${name}: preserves legacy partial simulation but explicitly leaves compatibility unverified`, () => {
    const partial = Object.fromEntries(Object.entries(legacy).filter(([key]) => ['cpuId', 'gpuId', 'ramId', 'storageId'].includes(key)));
    const result = simulate(partial);
    assert.deepEqual(result.technicalDetails?.compatibility ?? result.compatibility,
      { scope: 'partial_build', status: 'unverified', compatible: false });
    if (result.results) assert.ok(result.results.every(entry => Number.isFinite(entry.estimatedFps)));
    else assert.ok(Number.isFinite(result.estimatedFps ?? result.performanceScore));
  });
}

test('comparison rejects malformed build entries with a controlled 400', () => {
  for (const entry of [null, undefined, [], 3, 'invalid']) {
    assert.throws(() => compareBuilds({ builds: [entry, { components: legacy }] }), { statusCode: 400 });
  }
});

test('performance parameter updates reject out-of-scale specialized scores atomically', () => {
  const id = legacy.cpuId;
  const original = globalThis.structuredClone(findPerformanceParametersByComponentId(id));
  try {
    for (const field of ['gamingScore', 'productivityScore', 'airflowScore']) {
      for (const value of [-1, 101, 1000000]) {
        assert.throws(() => updatePerformanceParameters(id, { [field]: value }), { statusCode: 400 });
        assert.deepEqual(findPerformanceParametersByComponentId(id), original);
      }
    }
  } finally {
    updatePerformanceParameters(id, original);
  }
});

test('catalog integrity: unique parameter and rule identifiers, correct references and legacy serialization', () => {
  const catalog = new Map(components.map(part => [part.id, part]));
  assert.equal(new Set(performanceParameters.map(parameter => parameter.componentId)).size, performanceParameters.length);
  assert.equal(new Set(compatibilityRules.map(rule => rule.id)).size, compatibilityRules.length);
  for (const parameter of performanceParameters) {
    assert.equal(parameter.type, catalog.get(parameter.componentId)?.category);
    for (const field of ['performanceScore', 'gamingScore', 'productivityScore', 'airflowScore']) {
      if (parameter[field] != null) assert.ok(Number.isFinite(parameter[field]) && parameter[field] >= 0 && parameter[field] <= 100);
    }
  }
  for (const ready of readyBuilds) {
    const resolved = selectBuildComponents(ready.components);
    assert.equal(Object.keys(resolved).length, 7);
    assert.deepEqual(selectBuildComponents(serializeBuildSelection(resolved)), resolved);
  }
});
