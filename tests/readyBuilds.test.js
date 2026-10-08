import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getReadyBuildById,
  listReadyBuilds,
  supportedReadyBuildProfiles
} from '../src/services/readyBuildsService.js';
import { checkBuildCompatibility } from '../src/services/compatibility.service.js';
import { findComponentById } from '../src/services/component.service.js';

test('deve listar todas as configuracoes prontas', () => {
  const result = listReadyBuilds();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length >= supportedReadyBuildProfiles.length, true);
  assert.equal(result.some((readyBuild) => readyBuild.usageProfile === 'gaming'), true);
  assert.equal(Number.isFinite(result[0].estimatedTotalPrice), true);
});

test('deve filtrar configuracoes prontas por perfil de uso', () => {
  const result = listReadyBuilds({ profile: ' GAMING ' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((readyBuild) => readyBuild.usageProfile === 'gaming'), true);
});

test('deve consultar configuracao pronta por ID', () => {
  const result = getReadyBuildById('ready-build-gaming-1080p');

  assert.equal(result.id, 'ready-build-gaming-1080p');
  assert.equal(result.usageProfile, 'gaming');
  assert.equal(result.components.cpuId, 'cpu-ryzen-7-5700x');
});

test('deve usar apenas componentes existentes nas configuracoes prontas', () => {
  const result = listReadyBuilds();

  const allComponentIds = result.flatMap((readyBuild) => Object.values(readyBuild.components));

  assert.equal(allComponentIds.every((componentId) => Boolean(findComponentById(componentId))), true);
});

test('deve manter todas as configuracoes prontas compativeis', () => {
  const result = listReadyBuilds();

  assert.equal(
    result.every((readyBuild) => checkBuildCompatibility(readyBuild.components).compatible),
    true
  );
});

test('deve retornar lista vazia para perfil valido sem configuracao cadastrada', () => {
  const result = listReadyBuilds({ profile: 'general' })
    .filter((readyBuild) => readyBuild.id === 'ready-build-inexistente');

  assert.deepEqual(result, []);
});

test('deve retornar erro controlado para perfil invalido', () => {
  assert.throws(
    () => listReadyBuilds({ profile: 'perfil-inexistente' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Perfil de uso invalido.');
      assert.equal(error.errors[0].includes('gaming'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para configuracao pronta inexistente', () => {
  assert.throws(
    () => getReadyBuildById('ready-build-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuracao pronta nao encontrada.');
      return true;
    }
  );
});
// Historical advertised targets are not silently inflated to fit current prices.
test('ready presets disclose exact current totals above their original target ranges', () => {
  const result = getReadyBuildById('ready-build-gaming-1080p');
  assert.deepEqual(result.targetBudgetRange, { min: 4000, max: 5500 });
  assert.equal(result.budgetStatus, 'above_range');
  assert.equal(result.amountAboveTargetRange, Number((result.estimatedTotalPrice - 5500).toFixed(2)));
  assert.ok(result.amountAboveTargetRange > 0);
});
