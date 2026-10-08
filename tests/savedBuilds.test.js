import { referenceFixtureTotal } from './helpers/reference-price-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearSavedBuildsForTests,
  deleteSavedBuild,
  getSavedBuildById,
  listSavedBuilds,
  saveBuild,
  updateSavedBuild
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
  assert.equal(savedBuild.totalEstimatedPrice, referenceFixtureTotal());
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


test('deve editar o nome de uma configuração salva', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const updatedSavedBuild = updateSavedBuild(savedBuild.id, {
    name: 'Meu PC gamer atualizado'
  });

  assert.equal(updatedSavedBuild.id, savedBuild.id);
  assert.equal(updatedSavedBuild.name, 'Meu PC gamer atualizado');
  assert.equal(updatedSavedBuild.components.cpu, validSavedBuildInput.components.cpuId);
  assert.equal(Boolean(updatedSavedBuild.updatedAt), true);
  assert.ok(Date.parse(updatedSavedBuild.updatedAt) >= Date.parse(savedBuild.createdAt));
});

test('deve editar componentes de uma configuração salva', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const updatedSavedBuild = updateSavedBuild(savedBuild.id, {
    components: {
      cpuId: 'cpu-intel-i5-12400f',
      gpuId: 'gpu-rx-7600',
      motherboardId: 'mb-h610m-ddr4',
      ramId: 'ram-corsair-vengeance-16gb-ddr5',
      psuId: 'psu-generic-400w'
    }
  });

  assert.equal(updatedSavedBuild.components.cpu, 'cpu-intel-i5-12400f');
  assert.equal(updatedSavedBuild.components.gpu, 'gpu-rx-7600');
  assert.equal(updatedSavedBuild.components.motherboard, 'mb-h610m-ddr4');
  assert.equal(updatedSavedBuild.components.storage, validSavedBuildInput.components.storageId);
  assert.equal(typeof updatedSavedBuild.totalEstimatedPrice, 'number');
});

test('deve editar orçamento, tipo de uso e observações', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  const updatedSavedBuild = updateSavedBuild(savedBuild.id, {
    budget: {
      amount: 5500,
      currency: 'BRL'
    },
    usageType: 'streaming',
    observations: 'Troca feita para priorizar multitarefa.'
  });

  assert.equal(updatedSavedBuild.budget.amount, 5500);
  assert.equal(updatedSavedBuild.usageType, 'streaming');
  assert.equal(updatedSavedBuild.observations, 'Troca feita para priorizar multitarefa.');
});

test('deve retornar erro controlado ao editar configuração inexistente', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => updateSavedBuild('build-inexistente', { name: 'Build inexistente' }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});

test('deve retornar erro controlado ao editar componente inexistente', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  assert.throws(
    () => updateSavedBuild(savedBuild.id, {
      components: {
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

test('deve retornar erro controlado ao editar nome vazio', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild(validSavedBuildInput);

  assert.throws(
    () => updateSavedBuild(savedBuild.id, { name: '   ' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'O nome da configuração é obrigatório.');
      return true;
    }
  );
});
