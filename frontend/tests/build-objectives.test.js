import test from 'node:test';
import assert from 'node:assert/strict';
import { usageTypes } from '../src/utils/componentLabels.js';
import { describeBuildObjective, buildObjectiveDescriptions } from '../src/utils/buildObjectives.js';
test('every selectable initial objective explains its intent without claiming measured performance', () => {
  for (const usage of usageTypes) {
    assert.ok(buildObjectiveDescriptions[usage], usage);
    assert.match(describeBuildObjective(usage), /^Quero /);
    assert.doesNotMatch(describeBuildObjective(usage), /\d+\s*FPS|garante \d+/);
  }
  assert.match(describeBuildObjective('unknown'), /Escolha o uso principal/);
});
