import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { createPerformanceParameters } from '../src/services/performanceParametersService.js';
import { clearSavedBuildsForTests, saveBuild } from '../src/services/savedBuildsService.js';
import { suggestUpgrades } from '../src/services/upgradeSuggestionService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

function ensureUpgradeCandidate() {
  try {
    createAdminComponent({
      id: 'gpu-test-upgrade-4070',
      name: 'GPU Test Upgrade 4070',
      type: 'gpu',
      brand: 'Test',
      estimatedPrice: 1400,
      vram: 12,
      tdp: 180,
      length: 250,
      recommendedPsu: 650
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  try {
    createPerformanceParameters({
      componentId: 'gpu-test-upgrade-4070',
      type: 'gpu',
      performanceScore: 96,
      gamingScore: 98,
      vram: 12,
      tdp: 180,
      recommendedUse: ['gaming', 'general']
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

test('deve sugerir upgrade para build direta respeitando orcamento e compatibilidade', () => {
  ensureUpgradeCandidate();

  const result = suggestUpgrades({
    build: validBuild,
    budget: {
      amount: 1500,
      currency: 'BRL'
    },
    usageType: 'gaming',
    priority: 'cost-benefit'
  });

  assert.equal(result.currentBuildSummary.totalEstimatedPrice, 4699.3);
  assert.equal(result.suggestions.length > 0, true);

  const firstSuggestion = result.suggestions[0];

  // The expanded catalog offers a 1TB SSD with higher gain/cost in this fixture.
  // Keep the ranking assertion and verify that the injected GPU remains next.
  assert.equal(firstSuggestion.componentType, 'storage');
  assert.equal(firstSuggestion.currentComponent.id, 'ssd-kingston-nv2-1tb');
  assert.equal(firstSuggestion.suggestedComponent.id, 'ssd-samsung-980-pro-1tb');
  for (const suggestion of result.suggestions) {
    const capacityField = { storage: 'capacityGb', ram: 'capacityGb', gpu: 'vramGb' }[suggestion.componentType];
    if (capacityField) assert.ok(suggestion.suggestedComponent.specs[capacityField] >= suggestion.currentComponent.specs[capacityField]);
  }
  assert.equal(firstSuggestion.scoreGain, 20);
  assert.equal(result.suggestions[1].suggestedComponent.id, 'gpu-test-upgrade-4070');
  assert.equal(result.suggestions[1].currentComponent.id, 'gpu-rtx-4060');
  assert.equal(firstSuggestion.estimatedUpgradeCost <= 1500, true);
  assert.equal(['low', 'medium', 'high'].includes(firstSuggestion.expectedImpact), true);
  assert.equal(firstSuggestion.compatibilityStatus, 'compatible');
  assert.equal(typeof firstSuggestion.reason, 'string');
  assert.equal(Boolean(firstSuggestion.explanation.simpleExplanation), true);
});

test('deve sugerir upgrade para build salva por ID', () => {
  ensureUpgradeCandidate();
  clearSavedBuildsForTests();

  const savedBuild = saveBuild({
    name: 'Build salva para upgrade',
    components: validBuild,
    usageType: 'gaming'
  });

  const result = suggestUpgrades({
    buildId: savedBuild.id,
    budget: {
      amount: 1500,
      currency: 'BRL'
    },
    usageType: 'gaming'
  });

  assert.equal(result.suggestions.length > 0, true);
  assert.equal(result.suggestions[0].suggestedComponent.id, 'ssd-samsung-980-pro-1tb');
  const direct = suggestUpgrades({ build: validBuild, budget: { amount: 1500, currency: 'BRL' }, usageType: 'gaming' });
  assert.deepEqual(result.suggestions, direct.suggestions);
});

test('deve retornar mensagem clara quando nao houver upgrade dentro do orcamento', () => {
  ensureUpgradeCandidate();

  const result = suggestUpgrades({
    build: validBuild,
    budget: {
      amount: 100,
      currency: 'BRL'
    },
    usageType: 'gaming'
  });

  assert.equal(result.suggestions.length, 0);
  assert.equal(result.summary.includes('Nao foram encontrados upgrades compativeis'), true);
});

test('deve retornar erro controlado quando build nao for informada', () => {
  assert.throws(
    () => suggestUpgrades({
      budget: {
        amount: 1500,
        currency: 'BRL'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe uma build salva ou uma build direta para sugerir upgrades.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando build salva nao existir', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => suggestUpgrades({
      buildId: 'build-inexistente',
      budget: {
        amount: 1500,
        currency: 'BRL'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});
