import { referenceFixtureTotal } from './helpers/reference-price-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportBuildToJson,
  exportSavedBuildToJson
} from '../src/services/buildExportService.js';
import {
  clearSavedBuildsForTests,
  saveBuild
} from '../src/services/savedBuildsService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  gpuId: 'gpu-rtx-4060',
  motherboardId: 'mb-b550m-aorus-elite',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

const validBudget = {
  amount: 5000,
  currency: 'BRL'
};

test('deve exportar uma build direta em JSON estruturado', () => {
  const exportedBuild = exportBuildToJson({
    build: validBuild,
    budget: validBudget,
    usageType: 'gaming'
  });

  assert.equal(exportedBuild.exportVersion, '1.0');
  assert.equal(exportedBuild.source, 'PCPowerLab');
  assert.equal(Boolean(exportedBuild.exportedAt), true);
  assert.deepEqual(exportedBuild.build.components, validBuild);
  assert.deepEqual(exportedBuild.build.budget, validBudget);
  assert.equal(exportedBuild.build.usageType, 'gaming');
});

test('deve exportar uma build direta com resumo quando solicitado', () => {
  const exportedBuild = exportBuildToJson({
    build: validBuild,
    budget: validBudget,
    usageType: 'gaming',
    includeSummary: true
  });

  assert.equal(exportedBuild.summary.totalEstimatedPrice, referenceFixtureTotal());
  assert.equal(exportedBuild.summary.compatibilityStatus, 'compatible');
});

test('deve exportar uma build salva por ID', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild({
    name: 'Build para exportacao',
    components: validBuild,
    budget: validBudget,
    usageType: 'gaming'
  });

  const exportedBuild = exportSavedBuildToJson(savedBuild.id);

  assert.equal(exportedBuild.build.components.cpuId, validBuild.cpuId);
  assert.equal(exportedBuild.build.components.gpuId, validBuild.gpuId);
  assert.deepEqual(exportedBuild.build.budget, validBudget);
  assert.equal(exportedBuild.build.usageType, 'gaming');
});

test('deve exportar por buildId informado no payload', () => {
  clearSavedBuildsForTests();
  const savedBuild = saveBuild({
    name: 'Build salva exportavel',
    components: validBuild,
    budget: validBudget,
    usageType: 'gaming'
  });

  const exportedBuild = exportBuildToJson({
    buildId: savedBuild.id,
    includeSummary: true
  });

  assert.equal(exportedBuild.build.components.motherboardId, validBuild.motherboardId);
  assert.equal(exportedBuild.summary.compatibilityStatus, 'compatible');
});

test('deve retornar exportacao com aviso quando resumo falhar por erro controlado', () => {
  const exportedBuild = exportBuildToJson({
    build: validBuild,
    budget: {
      amount: 'valor-invalido',
      currency: 'BRL'
    },
    includeSummary: true
  });

  assert.equal(exportedBuild.summary, undefined);
  assert.equal(exportedBuild.warnings.length, 1);
  assert.equal(exportedBuild.warnings[0].message, 'Resumo indisponivel para os dados exportados.');
});

test('deve retornar erro controlado para build invalida', () => {
  assert.throws(
    () => exportBuildToJson({
      build: {
        cpuId: validBuild.cpuId
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Selecao de componentes incompleta.');
      return true;
    }
  );
});

test('deve retornar erro controlado para buildId inexistente', () => {
  clearSavedBuildsForTests();

  assert.throws(
    () => exportSavedBuildToJson('build-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});
