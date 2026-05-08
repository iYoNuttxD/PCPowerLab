import test from 'node:test';
import assert from 'node:assert/strict';

import { selectBuildComponents } from '../src/services/build.service.js';

const validSelection = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve montar configuracao com componentes selecionados', () => {
  const build = selectBuildComponents(validSelection);

  assert.equal(build.cpu.id, validSelection.cpuId);
  assert.equal(build.motherboard.id, validSelection.motherboardId);
  assert.equal(build.gpu.id, validSelection.gpuId);
  assert.equal(build.ram.id, validSelection.ramId);
  assert.equal(build.storage.id, validSelection.storageId);
  assert.equal(build.psu.id, validSelection.psuId);
  assert.equal(build.case.id, validSelection.caseId);
});

test('deve aceitar selecao aninhada em components', () => {
  const build = selectBuildComponents({
    components: {
      cpu: 'cpu-ryzen-5-5600',
      motherboard: 'mb-b550m-aorus-elite',
      gpu: 'gpu-rtx-4060',
      ram: 'ram-kingston-fury-16gb-ddr4',
      storage: 'ssd-kingston-nv2-1tb',
      psu: 'psu-corsair-650w',
      case: 'case-mid-tower-airflow'
    }
  });

  assert.equal(build.cpu.category, 'cpu');
  assert.equal(build.case.category, 'case');
});

test('deve retornar erro controlado quando componente obrigatorio nao for informado', () => {
  const selectionWithoutCpu = { ...validSelection };
  delete selectionWithoutCpu.cpuId;

  assert.throws(
    () => selectBuildComponents(selectionWithoutCpu),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Selecao de componentes incompleta.');
      assert.equal(error.errors.some((message) => message.includes('cpuId')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando componente nao existir', () => {
  assert.throws(
    () => selectBuildComponents({ ...validSelection, gpuId: 'gpu-inexistente' }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.errors.some((message) => message.includes('gpu-inexistente')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando componente estiver na categoria incorreta', () => {
  assert.throws(
    () => selectBuildComponents({ ...validSelection, cpuId: 'gpu-rtx-4060' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Componente selecionado em categoria incorreta.');
      assert.equal(error.errors.some((message) => message.includes('nao a cpu')), true);
      return true;
    }
  );
});