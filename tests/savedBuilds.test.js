import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSavedBuildsForTests,
  deleteSavedBuild,
  getSavedBuildById,
  listSavedBuilds,
  saveBuild
} from '../src/services/savedBuildsService.js';

const validSavedBuildInput = {
  name: 'Meu PC gamer custo-benefício',
  description: 'Configuração pensada para jogos em 1080p.',
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

test('deve salvar uma configuração montada', () => {
  clearSavedBuildsForTests();

  const savedBuild = saveBuild(validSavedBuildInput);

  assert.equal(savedBuild.id, 'build-001');
  assert.equal(savedBuild.name, validSavedBuildInput.name);
  assert.equal(savedBuild.components.cpu, validSavedBuildInput.components.cpuId);
  assert.equal(savedBuild.budget.amount, 5000);
  assert.equal(savedBuild.usageType, 'gaming');
  assert.equal(typeof savedBuild.totalEstimatedPrice, 'number');
  assert.equal(Boolean(savedBuild.createdAt), true);
  assert.equal(Boolean(savedBuild.updatedAt), true);
});

test('deve listar configurações salvas', () => {
  clearSavedBuildsForTests();
  saveBuild(validSavedBuildInput);

  const savedBuilds = listSavedBuilds();

  assert.equal(savedBuilds.length, 1);
  assert.equal(savedBuilds[0].name, validSavedBuildInput.name);
});

test('deve consultar configuração salva por ID', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const foundSavedBuild = getSavedBuildById(savedBuild.id);

  assert.equal(foundSavedBuild.id, savedBuild.id);
});

test('deve remover configuração salva', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const removedSavedBuild = deleteSavedBuild(savedBuild.id);

  assert.equal(removedSavedBuild.id, savedBuild.id);
  assert.equal(listSavedBuilds().length, 0);
});

test('deve retornar erro controlado quando nome não for informado', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => saveBuild({ ...validSavedBuildInput, name: ' ' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'O nome da configuração é obrigatório.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando componentes principais estiverem ausentes', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => saveBuild({
      ...validSavedBuildInput,
      components: {
        cpuId: 'cpu-ryzen-5-5600'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'A configuração deve conter todos os componentes principais.');
      assert.equal(error.errors.some((message) => message.includes('gpu')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando componente não existir', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => saveBuild({
      ...validSavedBuildInput,
      components: {
        ...validSavedBuildInput.components,
        gpuId: 'gpu-inexistente'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Um ou mais componentes informados não existem.');
      assert.equal(error.errors.some((message) => message.includes('gpu-inexistente')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando configuração salva não existir', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => getSavedBuildById('build-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});
