import test from 'node:test';
import assert from 'node:assert/strict';

import { compatibilityRules } from '../src/data/compatibility-rules.mock.js';
import { components } from '../src/data/components.mock.js';
import { games } from '../src/data/games.js';
import { notifications } from '../src/data/notifications.js';
import { performanceParameters } from '../src/data/performanceParameters.js';
import { professionalSoftware } from '../src/data/professionalSoftware.js';
import { purchaseLinks } from '../src/data/purchaseLinks.js';
import { componentCategories } from '../src/models/component.model.js';
import { readyBuilds } from '../src/data/readyBuilds.js';
import { recommendationFeedback } from '../src/data/recommendationFeedback.js';
import { savedBuilds } from '../src/data/savedBuilds.js';
import { savedBuildVersions } from '../src/data/savedBuildVersions.js';
import { usageProfiles } from '../src/data/usageProfiles.js';

test('deve manter dados mockados principais consistentes', () => {
  const componentIds = new Set();

  for (const component of components) {
    assert.equal(typeof component.id, 'string');
    assert.equal(component.id.length > 0, true);
    assert.equal(componentIds.has(component.id), false);
    assert.equal(componentCategories.includes(component.category), true);
    assert.equal(typeof component.name, 'string');
    assert.equal(Number.isFinite(component.price), true);
    assert.equal(component.price > 0, true);

    componentIds.add(component.id);
  }

  for (const parameter of performanceParameters) {
    assert.equal(componentIds.has(parameter.componentId), true);
    assert.equal(componentCategories.includes(parameter.type), true);
    assert.equal(Number.isFinite(parameter.performanceScore), true);
    assert.equal(parameter.performanceScore >= 0 && parameter.performanceScore <= 100, true);
  }

  for (const link of purchaseLinks) {
    assert.equal(componentIds.has(link.componentId), true);
    assert.equal(link.url.startsWith('https://'), true);
    assert.equal(link.currency, 'BRL');
    assert.equal(link.isAffiliate, false);
    assert.equal(['available', 'unavailable', 'unknown'].includes(link.availabilityStatus), true);
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
    assert.equal(game.minimumCpuScore >= 0 && game.recommendedCpuScore <= 100, true);
    assert.equal(game.minimumGpuScore >= 0 && game.recommendedGpuScore <= 100, true);
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
    assert.equal(software.minimumCpuScore >= 0 && software.recommendedCpuScore <= 100, true);
    assert.equal(software.minimumGpuScore >= 0 && software.recommendedGpuScore <= 100, true);
    assert.equal(software.minimumStorageScore >= 0 && software.recommendedStorageScore <= 100, true);
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

  const readyBuildIds = new Set();

  for (const readyBuild of readyBuilds) {
    assert.equal(typeof readyBuild.id, 'string');
    assert.equal(readyBuildIds.has(readyBuild.id), false);
    Object.values(readyBuild.components).forEach((componentId) => {
      assert.equal(componentIds.has(componentId), true);
    });
    assert.equal(Number.isFinite(readyBuild.targetBudgetRange.min), true);
    assert.equal(Number.isFinite(readyBuild.targetBudgetRange.max), true);
    assert.equal(readyBuild.targetBudgetRange.min < readyBuild.targetBudgetRange.max, true);
    readyBuildIds.add(readyBuild.id);
  }

  const savedBuildIds = new Set();

  for (const savedBuild of savedBuilds) {
    assert.equal(savedBuildIds.has(savedBuild.id), false);
    Object.values(savedBuild.components).forEach((componentId) => {
      assert.equal(componentIds.has(componentId), true);
    });
    savedBuildIds.add(savedBuild.id);
  }

  for (const version of savedBuildVersions) {
    assert.equal(savedBuildIds.has(version.buildId), true);
    assert.equal(version.buildSnapshot && typeof version.buildSnapshot === 'object', true);
  }

  for (const notification of notifications) {
    assert.equal(savedBuildIds.has(notification.buildId), true);
    assert.equal(['low', 'medium', 'high'].includes(notification.severity), true);
    assert.equal(typeof notification.read, 'boolean');
  }

  for (const feedback of recommendationFeedback) {
    assert.equal(Number.isFinite(feedback.rating), true);
    assert.equal(feedback.rating >= 1 && feedback.rating <= 5, true);
  }

  for (const usageProfile of usageProfiles) {
    const totalWeight = Object.values(usageProfile.weights).reduce((total, weight) => total + weight, 0);
    assert.equal(Number(totalWeight.toFixed(2)), 100);
    assert.equal(Object.values(usageProfile.weights).every((weight) => weight >= 0), true);
  }
});
