import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import { createPerformanceParameters } from '../src/services/performanceParametersService.js';
import { generateUpgradeRoadmap } from '../src/services/upgradeRoadmapService.js';
import { upgradeRoadmapRoutes } from '../src/routes/upgradeRoadmap.routes.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

function ensureRoadmapCandidates() {
  ensureGpuCandidate();
  ensureStorageCandidate();
}

function ensureGpuCandidate() {
  try {
    createAdminComponent({
      id: 'gpu-roadmap-upgrade-4070',
      name: 'GPU Roadmap Upgrade 4070',
      type: 'gpu',
      brand: 'Test',
      estimatedPrice: 1400,
      vram: 12,
      tdp: 180,
      length: 250,
      recommendedPsu: 650
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  try {
    createPerformanceParameters({
      componentId: 'gpu-roadmap-upgrade-4070',
      type: 'gpu',
      performanceScore: 96,
      gamingScore: 98,
      vram: 12,
      tdp: 180,
      recommendedUse: ['gaming', 'general']
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

function ensureStorageCandidate() {
  try {
    createAdminComponent({
      id: 'storage-roadmap-upgrade-2tb',
      name: 'Storage Roadmap Upgrade 2TB',
      type: 'storage',
      brand: 'Test',
      estimatedPrice: 500,
      interface: 'M.2 NVMe',
      capacity: 2000,
      storageType: 'SSD'
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }

  try {
    createPerformanceParameters({
      componentId: 'storage-roadmap-upgrade-2tb',
      type: 'storage',
      performanceScore: 92,
      gamingScore: 90,
      productivityScore: 94,
      capacity: 2000,
      interface: 'M.2 NVMe',
      readSpeed: 7000,
      recommendedUse: ['gaming', 'general', 'productivity']
    });
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

test('deve gerar plano de upgrades em etapas respeitando orcamento e limite', () => {
  ensureRoadmapCandidates();

  const roadmap = generateUpgradeRoadmap({
    build: validBuild,
    totalBudget: 2500,
    maxSteps: 3,
    usageType: 'gaming',
    priority: 'cost-benefit'
  });

  assert.equal(roadmap.totalEstimatedCost <= 2500, true);
  assert.equal(roadmap.steps.length <= 3, true);
  assert.equal(roadmap.steps.length > 0, true);
  assert.equal(roadmap.steps[0].step, 1);
  assert.equal(typeof roadmap.steps[0].componentType, 'string');
  assert.equal(typeof roadmap.steps[0].reason, 'string');
  assert.equal(['low', 'medium', 'high'].includes(roadmap.steps[0].expectedImpact), true);
  assert.equal(['low', 'medium', 'high'].includes(roadmap.steps[0].priority), true);
  assert.equal(roadmap.steps[0].compatibilityAfterStep.compatible, true);
  assert.equal(typeof roadmap.summary, 'string');
});

test('deve usar maxSteps padrao e limitar maxSteps a 5', () => {
  ensureRoadmapCandidates();

  const roadmap = generateUpgradeRoadmap({
    build: validBuild,
    totalBudget: 2500,
    maxSteps: 10,
    usageType: 'gaming'
  });

  assert.equal(roadmap.maxSteps, 5);
  assert.equal(roadmap.steps.length <= 5, true);
});

test('deve retornar lista vazia quando nao houver upgrade possivel dentro do orcamento', () => {
  ensureRoadmapCandidates();

  const roadmap = generateUpgradeRoadmap({
    build: validBuild,
    totalBudget: 100,
    usageType: 'gaming'
  });

  assert.equal(roadmap.maxSteps, 3);
  assert.deepEqual(roadmap.steps, []);
  assert.equal(roadmap.summary.includes('Nao foram encontrados upgrades compativeis'), true);
});

test('deve validar build e orcamento obrigatorios', () => {
  assert.throws(
    () => generateUpgradeRoadmap({ totalBudget: 1000 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe a build para gerar o plano de upgrades.');
      return true;
    }
  );

  assert.throws(
    () => generateUpgradeRoadmap({ build: validBuild, totalBudget: 0 }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Orcamento total invalido.');
      return true;
    }
  );
});

test('deve expor rota POST de roadmap de upgrades', () => {
  const paths = upgradeRoadmapRoutes.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .map((method) => `${method.toUpperCase()} ${layer.route.path}`));

  assert.equal(paths.includes('POST /roadmap'), true);
});
