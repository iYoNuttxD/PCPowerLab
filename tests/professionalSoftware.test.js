import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import {
  findProfessionalSoftwareById,
  listProfessionalSoftware,
  simulateProfessionalSoftwarePerformance
} from '../src/services/professionalSoftwareService.js';

const professionalBuild = {
  cpuId: 'cpu-ryzen-7-5700x',
  gpuId: 'gpu-rtx-4060',
  motherboardId: 'mb-b550m-aorus-elite',
  ramId: 'ram-kingston-fury-32gb-ddr4',
  storageId: 'ssd-samsung-980-pro-2tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve listar softwares profissionais mockados', () => {
  const software = listProfessionalSoftware();

  assert.equal(Array.isArray(software), true);
  assert.equal(software.length >= 12, true);
  assert.equal(software.some((item) => item.id === 'software-adobe-premiere-pro'), true);
  assert.equal(software.some((item) => item.id === 'software-blender'), true);
});

test('deve filtrar softwares profissionais por categoria', () => {
  const software = listProfessionalSoftware({ category: ' DESENVOLVIMENTO ' });

  assert.equal(software.length > 0, true);
  assert.equal(software.every((item) => item.category.toLowerCase() === 'desenvolvimento'), true);
});

test('deve consultar software profissional por ID', () => {
  const software = findProfessionalSoftwareById('software-adobe-premiere-pro');

  assert.equal(software.name, 'Adobe Premiere Pro');
  assert.equal(software.category, 'Edicao de video');
});

test('deve simular desempenho em software profissional', () => {
  const result = simulateProfessionalSoftwarePerformance({
    softwareId: 'software-adobe-premiere-pro',
    build: professionalBuild
  });

  assert.equal(result.software, 'Adobe Premiere Pro');
  assert.equal(result.category, 'Edicao de video');
  assert.equal(result.meetsMinimumRequirements, true);
  assert.equal(result.meetsRecommendedRequirements, false);
  assert.equal(result.performanceScore >= 75, true);
  assert.equal(result.performanceLevel, 'Muito bom');
  assert.equal(result.details.cpuStatus, 'recommended');
  assert.equal(result.details.ramStatus, 'recommended');
  assert.equal(result.details.storageStatus, 'recommended');
  assert.equal(result.summary.includes('Adobe Premiere Pro'), true);
});

test('deve retornar desempenho excelente quando atender requisitos recomendados', () => {
  const result = simulateProfessionalSoftwarePerformance({
    softwareId: 'software-office-productivity',
    build: professionalBuild
  });

  assert.equal(result.meetsMinimumRequirements, true);
  assert.equal(result.meetsRecommendedRequirements, true);
  assert.equal(result.performanceLevel, 'Excelente');
});

test('deve retornar erro controlado quando software nao existir', () => {
  assert.throws(
    () => simulateProfessionalSoftwarePerformance({
      softwareId: 'software-inexistente',
      build: professionalBuild
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Software profissional nao encontrado.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando build estiver incompleta', () => {
  assert.throws(
    () => simulateProfessionalSoftwarePerformance({
      softwareId: 'software-adobe-premiere-pro',
      build: {
        cpuId: 'cpu-ryzen-7-5700x'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((message) => message.includes('gpuId')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando faltarem parametros de desempenho', () => {
  createAdminComponent({
    id: 'cpu-test-software-no-score',
    name: 'CPU Test Software Sem Score',
    type: 'cpu',
    brand: 'Test',
    socket: 'AM4',
    cores: 4,
    threads: 8,
    baseClock: 3.2,
    boostClock: 4.0,
    tdp: 65
  });

  assert.throws(
    () => simulateProfessionalSoftwarePerformance({
      softwareId: 'software-adobe-premiere-pro',
      build: {
        ...professionalBuild,
        cpuId: 'cpu-test-software-no-score'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Parametros de desempenho insuficientes para simulacao em software profissional.');
      assert.equal(error.errors.some((message) => message.includes('cpu')), true);
      return true;
    }
  );
});
