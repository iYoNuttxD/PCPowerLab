import test from 'node:test';
import assert from 'node:assert/strict';

import { compatibilityRules } from '../src/data/compatibility-rules.mock.js';
import { components } from '../src/data/components.mock.js';
import { games } from '../src/data/games.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { professionalSoftware } from '../src/data/professionalSoftware.js';
import { purchaseLinks } from '../src/data/purchaseLinks.js';
import { componentCategories } from '../src/models/component.model.js';

test('deve manter dados mockados principais consistentes', () => {
  const componentIds = new Set();

  for (const component of components) {
    assert.equal(typeof component.id, 'string');
    assert.equal(component.id.length > 0, true);
    assert.equal(componentIds.has(component.id), false);
    assert.equal(componentCategories.includes(component.category), true);
    assert.equal(typeof component.name, 'string');
    assert.equal(Number.isFinite(component.price), true);

    componentIds.add(component.id);
  }

  for (const parameter of performanceParameters) {
    assert.equal(componentIds.has(parameter.componentId), true);
    assert.equal(componentCategories.includes(parameter.type), true);
    assert.equal(Number.isFinite(parameter.performanceScore), true);
  }

  for (const link of purchaseLinks) {
    assert.equal(componentIds.has(link.componentId), true);
  }

  const gameIds = new Set();

  for (const game of games) {
    assert.equal(/^game-[a-z0-9-]+$/.test(game.id), true);
    assert.equal(gameIds.has(game.id), false);
    assert.equal(typeof game.name, 'string');
    assert.equal(game.name.length > 0, true);
    assert.equal(Number.isFinite(game.minimumCpuScore), true);
    assert.equal(Number.isFinite(game.recommendedCpuScore), true);
    assert.equal(Number.isFinite(game.minimumGpuScore), true);
    assert.equal(Number.isFinite(game.recommendedGpuScore), true);
    assert.equal(game.minimumCpuScore <= game.recommendedCpuScore, true);
    assert.equal(game.minimumGpuScore <= game.recommendedGpuScore, true);
    assert.equal(Number.isFinite(game.minimumRamGb), true);
    assert.equal(Number.isFinite(game.recommendedRamGb), true);
    assert.equal(game.minimumRamGb <= game.recommendedRamGb, true);
    gameIds.add(game.id);
  }

  const softwareIds = new Set();

  for (const software of professionalSoftware) {
    assert.equal(/^software-[a-z0-9-]+$/.test(software.id), true);
    assert.equal(softwareIds.has(software.id), false);
    assert.equal(typeof software.name, 'string');
    assert.equal(software.name.length > 0, true);
    assert.equal(Number.isFinite(software.minimumCpuScore), true);
    assert.equal(Number.isFinite(software.recommendedCpuScore), true);
    assert.equal(Number.isFinite(software.minimumGpuScore), true);
    assert.equal(Number.isFinite(software.recommendedGpuScore), true);
    assert.equal(software.minimumCpuScore <= software.recommendedCpuScore, true);
    assert.equal(software.minimumGpuScore <= software.recommendedGpuScore, true);
    assert.equal(software.minimumRamGb <= software.recommendedRamGb, true);
    assert.equal(software.minimumStorageScore <= software.recommendedStorageScore, true);
    assert.equal(
      Number((software.cpuWeight + software.gpuWeight + software.ramWeight + software.storageWeight).toFixed(2)),
      1
    );
    softwareIds.add(software.id);
  }

  for (const rule of compatibilityRules) {
    assert.equal(typeof rule.id, 'string');
    assert.equal(typeof rule.name, 'string');
    assert.equal(typeof rule.field, 'string');
    assert.equal(typeof rule.operator, 'string');
    assert.equal(['low', 'medium', 'high'].includes(rule.severity), true);
  }
});
