import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearUsageProfilesForTests,
  createUsageProfile,
  deleteUsageProfile,
  getUsageProfileById,
  listUsageProfiles,
  updateUsageProfile
} from '../src/services/usageProfilesService.js';

test('deve criar perfil de uso personalizado', () => {
  clearUsageProfilesForTests();

  const profile = createUsageProfile({
    name: 'Jogos + Streaming',
    description: 'Perfil voltado para jogar e transmitir ao vivo com boa estabilidade.',
    weights: {
      cpu: 30,
      gpu: 35,
      ram: 20,
      storage: 10,
      costBenefit: 5
    },
    recommendedMinimums: {
      ramGb: 16,
      storageType: 'SSD',
      gpuVramGb: 8
    }
  });

  assert.equal(profile.id, 'usage-profile-jogos-streaming');
  assert.equal(profile.name, 'Jogos + Streaming');
  assert.equal(profile.description, 'Perfil voltado para jogar e transmitir ao vivo com boa estabilidade.');
  assert.deepEqual(profile.weights, {
    cpu: 30,
    gpu: 35,
    ram: 20,
    storage: 10,
    costBenefit: 5,
    budget: 0
  });
  assert.deepEqual(profile.recommendedMinimums, {
    ramGb: 16,
    storageType: 'SSD',
    gpuVramGb: 8
  });
  assert.equal(Boolean(profile.createdAt), true);
  assert.equal(Boolean(profile.updatedAt), true);
});

test('deve listar e consultar perfil de uso por ID', () => {
  clearUsageProfilesForTests();

  const profile = createUsageProfile({
    name: 'Docker pesado',
    weights: {
      cpu: 40,
      gpu: 5,
      ram: 35,
      storage: 15,
      costBenefit: 5
    }
  });

  assert.equal(listUsageProfiles().length, 1);
  assert.equal(getUsageProfileById(profile.id).name, 'Docker pesado');
});

test('deve normalizar pesos quando a soma for diferente de 100', () => {
  clearUsageProfilesForTests();

  const profile = createUsageProfile({
    name: 'Engenharia',
    weights: {
      cpu: 3,
      gpu: 3,
      ram: 2,
      storage: 1,
      costBenefit: 1
    }
  });

  const totalWeight = Object.values(profile.weights).reduce((total, weight) => total + weight, 0);

  assert.equal(totalWeight, 100);
  assert.equal(profile.weights.cpu, 30);
  assert.equal(profile.weights.gpu, 30);
});

test('deve gerar ID unico quando nomes forem repetidos', () => {
  clearUsageProfilesForTests();

  const firstProfile = createUsageProfile({
    name: 'Jogos + Streaming',
    weights: {
      cpu: 30,
      gpu: 35,
      ram: 20,
      storage: 10,
      costBenefit: 5
    }
  });
  const secondProfile = createUsageProfile({
    name: 'Jogos + Streaming',
    weights: {
      cpu: 25,
      gpu: 35,
      ram: 20,
      storage: 10,
      costBenefit: 10
    }
  });

  assert.equal(firstProfile.id, 'usage-profile-jogos-streaming');
  assert.equal(secondProfile.id, 'usage-profile-jogos-streaming-2');
});

test('deve atualizar perfil e mudar updatedAt', () => {
  clearUsageProfilesForTests();

  const profile = createUsageProfile({
    name: 'Video 4K',
    weights: {
      cpu: 35,
      gpu: 25,
      ram: 25,
      storage: 10,
      costBenefit: 5
    }
  });

  const updatedProfile = updateUsageProfile(profile.id, {
    description: 'Perfil para edicao de video em 4K.',
    weights: {
      cpu: 35,
      gpu: 25,
      ram: 20,
      storage: 15,
      costBenefit: 5
    }
  });

  assert.equal(updatedProfile.description, 'Perfil para edicao de video em 4K.');
  assert.equal(updatedProfile.weights.storage, 15);
  assert.ok(Date.parse(updatedProfile.updatedAt) >= Date.parse(profile.createdAt));
});

test('deve remover perfil de uso', () => {
  clearUsageProfilesForTests();

  const profile = createUsageProfile({
    name: 'Estudo leve',
    weights: {
      cpu: 20,
      gpu: 5,
      ram: 25,
      storage: 20,
      costBenefit: 30
    }
  });

  const deletedProfile = deleteUsageProfile(profile.id);

  assert.equal(deletedProfile.id, profile.id);
  assert.equal(listUsageProfiles().length, 0);
});

test('deve retornar erro controlado quando nome estiver ausente', () => {
  clearUsageProfilesForTests();

  assert.throws(
    () => createUsageProfile({
      weights: {
        cpu: 30,
        gpu: 35,
        ram: 20,
        storage: 10,
        costBenefit: 5
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Perfil de uso inválido.');
      assert.equal(error.errors.includes('name é obrigatório.'), true);
      return true;
    }
  );
});

test('deve validar pesos invalidos', () => {
  clearUsageProfilesForTests();

  assert.throws(
    () => createUsageProfile({
      name: 'Perfil invalido',
      weights: {
        cpu: 40,
        gpu: -10,
        ram: 30,
        storage: 20,
        costBenefit: 20
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((item) => item.includes('gpu')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para perfil inexistente', () => {
  clearUsageProfilesForTests();

  assert.throws(
    () => getUsageProfileById('usage-profile-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Perfil de uso não encontrado.');
      return true;
    }
  );
});
