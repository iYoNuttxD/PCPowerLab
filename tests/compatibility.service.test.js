import test from 'node:test';
import assert from 'node:assert/strict';

import { checkBuildCompatibility } from '../src/services/compatibility.service.js';

test('deve retornar configuração compatível quando as peças forem adequadas', () => {
  const result = checkBuildCompatibility({
    cpu: 'cpu-ryzen-5-5600',
    motherboard: 'mb-b550m-aorus-elite',
    gpu: 'gpu-rtx-4060',
    ram: 'ram-kingston-fury-16gb-ddr4',
    storage: 'ssd-kingston-nv2-1tb',
    psu: 'psu-corsair-650w',
    case: 'case-mid-tower-airflow'
  });

  assert.equal(result.compatible, true);
  assert.equal(result.alerts.length, 0);
});

test('deve alertar incompatibilidade entre processador e placa-mãe', () => {
  const result = checkBuildCompatibility({
    cpu: 'cpu-intel-i5-12400f',
    motherboard: 'mb-b550m-aorus-elite',
    gpu: 'gpu-rtx-4060',
    ram: 'ram-kingston-fury-16gb-ddr4',
    storage: 'ssd-kingston-nv2-1tb',
    psu: 'psu-corsair-650w',
    case: 'case-mid-tower-airflow'
  });

  assert.equal(result.compatible, false);
  assert.equal(result.alerts.some((alert) => alert.code === 'CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE'), true);
});

test('deve alertar fonte abaixo do recomendado', () => {
  const result = checkBuildCompatibility({
    cpu: 'cpu-ryzen-5-5600',
    motherboard: 'mb-b550m-aorus-elite',
    gpu: 'gpu-rtx-4060',
    ram: 'ram-kingston-fury-16gb-ddr4',
    storage: 'ssd-kingston-nv2-1tb',
    psu: 'psu-generic-400w',
    case: 'case-mid-tower-airflow'
  });

  assert.equal(result.compatible, false);
  assert.equal(result.alerts.some((alert) => alert.code === 'PSU_POWER_BELOW_RECOMMENDED'), true);
});
