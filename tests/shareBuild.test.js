import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSavedBuildsForTests,
  saveBuild
} from '../src/services/savedBuildsService.js';
import {
  clearSharedBuildsForTests,
  createBuildShare,
  getSharedBuildById,
  listSharedBuilds
} from '../src/services/shareBuildService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

const validSavedBuildInput = {
  name: 'Meu PC gamer',
  components: validBuild,
  budget: {
    amount: 5000,
    currency: 'BRL'
  },
  usageType: 'gaming'
};

test('deve gerar compartilhamento para build salva', () => {
  clearSavedBuildsForTests();
  clearSharedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const sharedBuild = createBuildShare({ buildId: savedBuild.id });

  assert.equal(sharedBuild.shareId, 'share-001');
  assert.equal(sharedBuild.shareUrl, '/shared/share-001');
  assert.equal(sharedBuild.status, 'active');
  assert.equal(sharedBuild.source, 'saved_build');
  assert.equal(sharedBuild.buildId, savedBuild.id);
  assert.equal(sharedBuild.buildSummary.name, validSavedBuildInput.name);
  assert.equal(sharedBuild.buildSummary.totalEstimatedPrice, 4699.3);
  assert.equal(sharedBuild.buildSummary.compatibility.compatible, true);
  assert.equal(sharedBuild.buildSummary.componentIds.cpu, validBuild.cpuId);
  assert.equal(Boolean(sharedBuild.createdAt), true);
});

test('deve gerar compartilhamento para build direta', () => {
  clearSharedBuildsForTests();

  const sharedBuild = createBuildShare({
    name: 'Build direta para comunidade',
    build: validBuild,
    budget: {
      amount: 4800,
      currency: 'BRL'
    },
    usageType: 'gaming'
  });

  assert.equal(sharedBuild.shareId, 'share-001');
  assert.equal(sharedBuild.source, 'direct_build');
  assert.equal(sharedBuild.buildSummary.name, 'Build direta para comunidade');
  assert.equal(sharedBuild.buildSummary.budgetStatus.status, 'within_budget');
  assert.equal(sharedBuild.buildSummary.components.gpu.id, validBuild.gpuId);
});

test('deve consultar compartilhamento por shareId', () => {
  clearSharedBuildsForTests();
  const sharedBuild = createBuildShare({
    build: validBuild
  });

  const foundSharedBuild = getSharedBuildById(sharedBuild.shareId);

  assert.equal(foundSharedBuild.shareId, sharedBuild.shareId);
  assert.equal(listSharedBuilds().length, 1);
});

test('deve retornar erro controlado quando buildId nao existir', () => {
  clearSavedBuildsForTests();
  clearSharedBuildsForTests();

  assert.throws(
    () => createBuildShare({ buildId: 'build-inexistente' }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando nenhum dado for informado', () => {
  assert.throws(
    () => createBuildShare({}),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe uma build salva ou uma build direta para compartilhamento.');
      assert.equal(error.errors.includes('Envie buildId ou build.'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando shareId nao existir', () => {
  clearSharedBuildsForTests();

  assert.throws(
    () => getSharedBuildById('share-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Compartilhamento de build nao encontrado.');
      return true;
    }
  );
});