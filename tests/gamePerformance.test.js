import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminComponent } from '../src/services/admin-component.service.js';
import {
  listGames,
  simulateGamePerformance
} from '../src/services/gamePerformanceService.js';
import { createPerformanceParameters } from '../src/services/performanceParametersService.js';

const baseSimulationInput = {
  gameId: 'game-cyberpunk-2077',
  targetResolution: '1080p',
  qualityPreset: 'high',
  build: {
    cpuId: 'cpu-ryzen-5-5600',
    gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb'
  }
};

test('deve listar jogos mockados para simulacao', () => {
  const result = listGames();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length >= 3, true);
  assert.equal(result.some((game) => game.id === 'game-cyberpunk-2077'), true);
});

test('deve filtrar jogos por categoria', () => {
  const result = listGames({ category: ' COMPETITIVE ' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((game) => game.category === 'competitive'), true);
});

test('deve simular desempenho esperado em jogo com build parcial', () => {
  const result = simulateGamePerformance(baseSimulationInput);

  assert.equal(result.game, 'Cyberpunk 2077');
  assert.equal(result.targetResolution, '1080p');
  assert.equal(result.qualityPreset, 'high');
  assert.equal(result.meetsMinimumRequirements, true);
  assert.equal(result.meetsRecommendedRequirements, false);
  assert.equal(result.performanceLevel, 'good');
  assert.equal(result.details.cpuStatus, 'belowRecommended');
  assert.equal(result.details.gpuStatus, 'belowRecommended');
  assert.equal(result.details.ramStatus, 'recommended');
  assert.equal(Number.isInteger(result.estimatedFps), true);
  assert.equal(result.estimatedFps > 0, true);
});

test('deve retornar desempenho otimo quando atender requisitos recomendados', () => {
  const result = simulateGamePerformance({
    ...baseSimulationInput,
    gameId: 'game-valorant',
    qualityPreset: 'ultra',
    build: {
      ...baseSimulationInput.build,
      storageId: 'ssd-wd-black-sn770-1tb'
    }
  });

  assert.equal(result.meetsMinimumRequirements, true);
  assert.equal(result.meetsRecommendedRequirements, true);
  assert.equal(result.performanceLevel, 'excellent');
});

test('deve aplicar penalidade de gargalo quando build completa estiver disponivel', () => {
  createAdminComponent({
    id: 'cpu-test-game-low-score',
    name: 'CPU Test Game Score Baixo',
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
    componentId: 'cpu-test-game-low-score',
    type: 'cpu',
    performanceScore: 50,
    gamingScore: 50,
    tdp: 65
  });

  const result = simulateGamePerformance({
    ...baseSimulationInput,
    build: {
      cpuId: 'cpu-test-game-low-score',
      motherboardId: 'mb-b550m-aorus-elite',
      gpuId: 'gpu-rtx-4060',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-nv2-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    }
  });

  assert.equal(result.technicalDetails.bottleneckPenalty < 1, true);
  assert.equal(result.technicalDetails.bottlenecks.some((bottleneck) => bottleneck.type === 'cpu_bottleneck'), true);
});

test('deve retornar erro controlado quando jogo nao existir', () => {
  assert.throws(
    () => simulateGamePerformance({
      ...baseSimulationInput,
      gameId: 'game-inexistente'
    }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Jogo nao encontrado.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando build estiver incompleta', () => {
  assert.throws(
    () => simulateGamePerformance({
      gameId: 'game-cyberpunk-2077',
      build: {
        cpuId: 'cpu-ryzen-5-5600'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((message) => message.includes('gpuId')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando parametros de desempenho nao existirem', () => {
  createAdminComponent({
    id: 'cpu-test-game-no-score',
    name: 'CPU Test Game Sem Score',
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
    () => simulateGamePerformance({
      ...baseSimulationInput,
      build: {
        ...baseSimulationInput.build,
        cpuId: 'cpu-test-game-no-score'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Parametros de desempenho insuficientes para simulacao de jogos.');
      assert.equal(error.errors.some((message) => message.includes('cpu')), true);
      return true;
    }
  );
});
