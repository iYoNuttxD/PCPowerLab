import { selectBuildComponents } from './build.service.js';
import {
  bottleneckThresholds,
  calculateEstimatedConsumptionWatts,
  getOverallBalance,
  getScoreDifference,
  getScoreDifferenceSeverity
} from '../utils/performance-score-utils.js';

const componentsWithRequiredPerformanceScore = ['cpu', 'gpu', 'ram', 'storage'];

export function analyzeBuildBottlenecks(selectionInput) {
  const build = selectBuildComponents(selectionInput);

  validatePerformanceParameters(build);

  const bottlenecks = [
    analyzeCpuGpuBalance(build),
    analyzeRamLimitations(build),
    analyzeStorageLimitations(build),
    analyzePsuHeadroom(build)
  ].flat().filter(Boolean);

  return {
    hasBottleneck: bottlenecks.length > 0,
    overallBalance: getOverallBalance(bottlenecks),
    bottlenecks,
    performanceSummary: buildPerformanceSummary(build)
  };
}

function analyzeCpuGpuBalance(build) {
  const cpuScore = build.cpu.specs.performanceScore;
  const gpuScore = build.gpu.specs.performanceScore;
  const difference = getScoreDifference(cpuScore, gpuScore);
  const severity = getScoreDifferenceSeverity(difference);

  if (!severity) {
    return null;
  }

  if (cpuScore < gpuScore) {
    return {
      type: 'cpu_bottleneck',
      severity,
      component: 'cpu',
      relatedComponent: 'gpu',
      message: 'O processador pode limitar parcialmente o desempenho da placa de video em jogos e tarefas graficas.',
      technicalDetails: {
        cpuScore,
        gpuScore,
        difference
      }
    };
  }

  return {
    type: 'gpu_bottleneck',
    severity,
    component: 'gpu',
    relatedComponent: 'cpu',
    message: 'A placa de video pode limitar o aproveitamento do processador em tarefas graficas.',
    technicalDetails: {
      cpuScore,
      gpuScore,
      difference
    }
  };
}

function analyzeRamLimitations(build) {
  const bottlenecks = [];
  const { capacityGb, speedMhz, performanceScore } = build.ram.specs;

  if (capacityGb < bottleneckThresholds.minimumRamCapacityGb) {
    bottlenecks.push({
      type: 'ram_capacity_limitation',
      severity: capacityGb < 8 ? 'high' : 'medium',
      component: 'ram',
      relatedComponent: null,
      message: 'A capacidade de memoria RAM pode limitar multitarefas e jogos recentes.',
      technicalDetails: {
        capacityGb,
        minimumRecommendedGb: bottleneckThresholds.minimumRamCapacityGb,
        ramScore: performanceScore
      }
    });
  }

  if (speedMhz < bottleneckThresholds.minimumRamSpeedMhz) {
    bottlenecks.push({
      type: 'ram_speed_limitation',
      severity: 'low',
      component: 'ram',
      relatedComponent: 'cpu',
      message: 'A velocidade da memoria RAM pode reduzir parte do desempenho do processador.',
      technicalDetails: {
        speedMhz,
        minimumRecommendedMhz: bottleneckThresholds.minimumRamSpeedMhz,
        ramScore: performanceScore
      }
    });
  }

  return bottlenecks;
}

function analyzeStorageLimitations(build) {
  const { performanceScore, readSpeedMbS, storageType } = build.storage.specs;
  const isLowScore = performanceScore < bottleneckThresholds.minimumStorageScore;
  const isSlowRead = readSpeedMbS < bottleneckThresholds.minimumStorageReadSpeedMbS;

  if (!isLowScore && !isSlowRead) {
    return null;
  }

  return {
    type: 'storage_speed_limitation',
    severity: isLowScore ? 'medium' : 'low',
    component: 'storage',
    relatedComponent: null,
    message: 'O armazenamento pode aumentar tempos de carregamento e deixar o uso geral menos responsivo.',
    technicalDetails: {
      storageScore: performanceScore,
      readSpeedMbS,
      storageType,
      minimumRecommendedScore: bottleneckThresholds.minimumStorageScore,
      minimumRecommendedReadSpeedMbS: bottleneckThresholds.minimumStorageReadSpeedMbS
    }
  };
}

function analyzePsuHeadroom(build) {
  const estimatedConsumptionWatts = calculateEstimatedConsumptionWatts(build);
  const psuWatts = build.psu.specs.watts;
  const headroomWatts = psuWatts - estimatedConsumptionWatts;
  const headroomPercent = Math.round((headroomWatts / estimatedConsumptionWatts) * 100);

  if (headroomPercent > bottleneckThresholds.psuAttentionHeadroomPercent) {
    return null;
  }

  return {
    type: 'psu_headroom_attention',
    severity: 'low',
    component: 'psu',
    relatedComponent: 'build',
    message: 'A fonte esta com pouca folga em relacao ao consumo estimado; isso merece atencao em upgrades futuros.',
    technicalDetails: {
      psuWatts,
      estimatedConsumptionWatts,
      headroomWatts,
      headroomPercent
    }
  };
}

function validatePerformanceParameters(build) {
  const errors = componentsWithRequiredPerformanceScore
    .filter((slot) => !isValidScore(build[slot].specs.performanceScore))
    .map((slot) => `Parametro de desempenho ausente ou invalido para ${slot}: performanceScore.`);

  if (!isValidNumber(build.ram.specs.capacityGb)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: capacityGb.');
  }

  if (!isValidNumber(build.ram.specs.speedMhz)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: speedMhz.');
  }

  if (!isValidNumber(build.storage.specs.readSpeedMbS)) {
    errors.push('Parametro de desempenho ausente ou invalido para storage: readSpeedMbS.');
  }

  if (!isValidNumber(build.cpu.specs.tdpWatts)) {
    errors.push('Parametro de consumo ausente ou invalido para cpu: tdpWatts.');
  }

  if (!isValidNumber(build.gpu.specs.tdpWatts)) {
    errors.push('Parametro de consumo ausente ou invalido para gpu: tdpWatts.');
  }

  if (!isValidNumber(build.psu.specs.watts)) {
    errors.push('Parametro de consumo ausente ou invalido para psu: watts.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Parametros de desempenho insuficientes para analise de gargalos.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function buildPerformanceSummary(build) {
  return {
    cpuScore: build.cpu.specs.performanceScore,
    gpuScore: build.gpu.specs.performanceScore,
    ramScore: build.ram.specs.performanceScore,
    storageScore: build.storage.specs.performanceScore,
    estimatedConsumptionWatts: calculateEstimatedConsumptionWatts(build),
    psuWatts: build.psu.specs.watts
  };
}

function isValidScore(value) {
  return isValidNumber(value) && value >= 0 && value <= 100;
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
