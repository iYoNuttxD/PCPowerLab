import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSavedBuildsForTests,
  saveBuild
} from '../src/services/savedBuildsService.js';
import {
  createSavedBuild,
  editSavedBuild
} from '../src/controllers/savedBuildsController.js';
import {
  clearSavedBuildVersionsForTests,
  createSavedBuildVersion,
  deleteSavedBuildVersion,
  getSavedBuildVersionById,
  listSavedBuildVersions
} from '../src/services/savedBuildVersionsService.js';

const validSavedBuildInput = {
  name: 'Meu PC gamer custo-beneficio',
  components: {
    cpuId: 'cpu-ryzen-5-5600',
    gpuId: 'gpu-rtx-4060',
    motherboardId: 'mb-b550m-aorus-elite',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  },
  budget: {
    amount: 5000,
    currency: 'BRL'
  },
  usageType: 'gaming'
};

const validVersionInput = {
  reason: 'Alteracao da placa de video para melhorar desempenho em jogos.',
  buildSnapshot: {
    name: 'Meu PC gamer atualizado',
    components: validSavedBuildInput.components,
    budget: validSavedBuildInput.budget,
    usageType: 'gaming'
  }
};

test('deve registrar versao de uma configuracao salva', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);

  const version = createSavedBuildVersion(savedBuild.id, validVersionInput);

  assert.equal(version.id, 'version-001');
  assert.equal(version.buildId, savedBuild.id);
  assert.equal(version.versionNumber, 1);
  assert.equal(version.reason, validVersionInput.reason);
  assert.deepEqual(version.buildSnapshot, validVersionInput.buildSnapshot);
  assert.equal(Boolean(version.createdAt), true);
});

test('deve usar motivo padrao quando reason nao for informado', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);

  const version = createSavedBuildVersion(savedBuild.id, {
    buildSnapshot: validVersionInput.buildSnapshot
  });

  assert.equal(version.reason, 'Versao registrada sem motivo informado.');
});

test('deve controlar versionNumber incremental por build', () => {
  resetStores();
  const firstBuild = saveBuild(validSavedBuildInput);
  const secondBuild = saveBuild({
    ...validSavedBuildInput,
    name: 'Build secundaria'
  });

  createSavedBuildVersion(firstBuild.id, validVersionInput);
  const secondVersionForFirstBuild = createSavedBuildVersion(firstBuild.id, validVersionInput);
  const firstVersionForSecondBuild = createSavedBuildVersion(secondBuild.id, validVersionInput);

  assert.equal(secondVersionForFirstBuild.versionNumber, 2);
  assert.equal(firstVersionForSecondBuild.versionNumber, 1);
});

test('deve listar versoes de uma build', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);
  createSavedBuildVersion(savedBuild.id, validVersionInput);
  createSavedBuildVersion(savedBuild.id, {
    ...validVersionInput,
    reason: 'Ajuste de orcamento.'
  });

  const versions = listSavedBuildVersions(savedBuild.id);

  assert.equal(versions.length, 2);
  assert.equal(versions[0].buildId, savedBuild.id);
});

test('deve consultar versao especifica', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);
  const version = createSavedBuildVersion(savedBuild.id, validVersionInput);

  const foundVersion = getSavedBuildVersionById(savedBuild.id, version.id);

  assert.equal(foundVersion.id, version.id);
});

test('deve remover versao de uma build', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);
  const version = createSavedBuildVersion(savedBuild.id, validVersionInput);

  const removedVersion = deleteSavedBuildVersion(savedBuild.id, version.id);

  assert.equal(removedVersion.id, version.id);
  assert.equal(listSavedBuildVersions(savedBuild.id).length, 0);
});

test('deve retornar erro controlado para build inexistente', () => {
  resetStores();

  assert.throws(
    () => createSavedBuildVersion('build-inexistente', validVersionInput),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});

test('deve exigir buildSnapshot', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);

  assert.throws(
    () => createSavedBuildVersion(savedBuild.id, {
      reason: 'Sem snapshot.'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Snapshot da configuracao e obrigatorio.');
      return true;
    }
  );
});

test('deve manter snapshot independente da configuracao atual', () => {
  resetStores();
  const savedBuild = saveBuild(validSavedBuildInput);
  const snapshot = {
    name: 'Snapshot original',
    components: {
      gpuId: 'gpu-rtx-4060'
    }
  };

  const version = createSavedBuildVersion(savedBuild.id, {
    buildSnapshot: snapshot
  });
  snapshot.components.gpuId = 'gpu-rx-7600';

  assert.equal(version.buildSnapshot.components.gpuId, 'gpu-rtx-4060');
});

test('deve registrar versoes automaticamente ao criar e editar build salva pelo controller', () => {
  resetStores();
  const createResponse = createMockResponse();

  createSavedBuild(
    {
      body: validSavedBuildInput
    },
    createResponse,
    createMockNext()
  );

  const savedBuild = createResponse.body.data;
  const editResponse = createMockResponse();

  editSavedBuild(
    {
      params: {
        id: savedBuild.id
      },
      body: {
        name: 'Meu PC gamer atualizado'
      }
    },
    editResponse,
    createMockNext()
  );

  const versions = listSavedBuildVersions(savedBuild.id);

  assert.equal(versions.length, 2);
  assert.equal(versions[0].versionNumber, 1);
  assert.equal(versions[1].versionNumber, 2);
  assert.equal(versions[0].buildSnapshot.name, validSavedBuildInput.name);
  assert.equal(versions[1].buildSnapshot.name, 'Meu PC gamer atualizado');
});

function resetStores() {
  clearSavedBuildsForTests();
  clearSavedBuildVersionsForTests();
}

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;

      return this;
    },
    json(body) {
      this.body = body;

      return this;
    }
  };
}

function createMockNext() {
  return (error) => {
    if (error) {
      throw error;
    }
  };
}