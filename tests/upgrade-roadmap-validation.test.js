import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';

const build = {
  cpuId: 'cpu-ryzen-5-5600', motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060', ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb', psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('roadmap rejects fractional step counts instead of silently producing a shorter or empty plan', () => {
  for (const maxSteps of [0.5, 1.5, 3.2, 5.5, '0.5']) {
    assert.throws(() => generateUpgradeRoadmap({ build, totalBudget: 2500, maxSteps, usageType: 'gaming' }), error => {
      assert.equal(error.statusCode, 400);
      assert.match(error.errors.join(' '), /inteiro/);
      return true;
    }, `maxSteps=${maxSteps} must be rejected`);
  }
});
