import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { analyzeBuildBottlenecks } from '../src/services/bottleneck.service.js';
import { createPerformanceParameters } from '../src/services/performanceParametersService.js';

test('deve identificar gargalo moderado de processador em relacao a placa de video', () => {
  createAdminComponent({
    id: 'cpu-test-low-performance-score',
    name: 'CPU Test Score Baixo',
    type: 'cpu',
    brand: 'Test',
    socket: 'AM4',
    cores: 4,
    threads: 8,
    baseClock: 3.2,
    boostClock: 4.0,
    tdp: 65
  });

  createPerformanceParameters({
    componentId: 'cpu-test-low-performance-score',
    type: 'cpu',
    performanceScore: 60,
    tdp: 65
  });

  const result = analyzeBuildBottlenecks({
    cpuId: 'cpu-test-low-performance-score',
    motherboardId: 'mb-b550m-aorus-elite',
    gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  });

  assert.equal(result.hasBottleneck, true);
  assert.equal(result.overallBalance, 'moderate');
  assert.equal(result.bottlenecks.some((bottleneck) => bottleneck.type === 'cpu_bottleneck'), true);

  const cpuBottleneck = result.bottlenecks.find((bottleneck) => bottleneck.type === 'cpu_bottleneck');

  assert.equal(cpuBottleneck.severity, 'medium');
  assert.equal(cpuBottleneck.component, 'cpu');
  assert.equal(cpuBottleneck.relatedComponent, 'gpu');
  assert.equal(cpuBottleneck.technicalDetails.difference, 25);
});

test('deve retornar build equilibrada quando scores principais estiverem proximos', () => {
  const result = analyzeBuildBottlenecks({
    cpuId: 'cpu-ryzen-5-5600',
    motherboardId: 'mb-b550m-aorus-elite',
    gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  });

  assert.equal(result.hasBottleneck, false);
  assert.equal(result.overallBalance, 'balanced');
  assert.equal(result.bottlenecks.length, 0);
});

test('deve aceitar selecao aninhada em components', () => {
  const result = analyzeBuildBottlenecks({
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

  assert.equal(result.hasBottleneck, false);
  assert.equal(result.overallBalance, 'balanced');
});

test('deve aceitar selecao aninhada em components com campos de ID', () => {
  const result = analyzeBuildBottlenecks({
    components: {
      cpuId: 'cpu-ryzen-5-5600',
      motherboardId: 'mb-b550m-aorus-elite',
      gpuId: 'gpu-rtx-4060',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-nv2-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    }
  });

  assert.equal(result.hasBottleneck, false);
  assert.equal(result.overallBalance, 'balanced');
});

test('deve retornar erro controlado quando faltar parametro de desempenho', () => {
  createAdminComponent({
    id: 'cpu-test-no-performance-score',
    name: 'CPU Test Sem Score',
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
    () => analyzeBuildBottlenecks({
      cpuId: 'cpu-test-no-performance-score',
      motherboardId: 'mb-b550m-aorus-elite',
      gpuId: 'gpu-rtx-4060',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-nv2-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Parametros de desempenho insuficientes para analise de gargalos.');
      assert.equal(error.errors.some((message) => message.includes('nao encontrados para cpu')), true);
      return true;
    }
  );
});
