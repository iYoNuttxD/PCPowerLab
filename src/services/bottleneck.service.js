import { performanceMetadata } from '../utils/performanceMethodology.js';
import { unavailablePerformance } from '../utils/performanceAvailability.js';
import { getCoolingPower } from './cooling.service.js';
import { selectBuildComponents } from './build.service.js';
import { findPerformanceParametersByComponentId } from './performanceParametersService.js';
import {
  bottleneckThresholds,
  calculateEstimatedConsumptionWatts,
  getOverallBalance,
  getScoreDifference,
  getScoreDifferenceSeverity
} from '../utils/performance-score-utils.js';

const requiredPerformanceParameterSlots = ['cpu', 'gpu', 'ram', 'storage', 'psu'];
const componentsWithRequiredPerformanceScore = ['cpu', 'gpu', 'ram', 'storage'];

export function analyzeBuildBottlenecks(selectionInput) {
  const build = selectBuildComponents(selectionInput);
  const unavailable = unavailablePerformance(build);
  if (unavailable) return { ...performanceMetadata(build), ...unavailable, hasBottleneck: null, overallBalance: 'unavailable', bottlenecks: [], performanceSummary: null };
  const performanceParameters = mapPerformanceParameters(build);
  const coolingPower = getCoolingPower(build);

  validatePerformanceParameters(performanceParameters);

  const bottlenecks = [
    analyzeCpuGpuBalance(performanceParameters),
    analyzeRamLimitations(performanceParameters),
    analyzeStorageLimitations(performanceParameters),
    analyzePsuHeadroom(performanceParameters, coolingPower)
  ].flat().filter(Boolean);

  return {
    ...performanceMetadata(build),
    hasBottleneck: bottlenecks.length > 0,
    overallBalance: getOverallBalance(bottlenecks),
    bottlenecks,
    performanceSummary: buildPerformanceSummary(performanceParameters, coolingPower, Boolean(build.cooler || build.fans?.length))
  };
}

function mapPerformanceParameters(build) {
  return requiredPerformanceParameterSlots.reduce((parametersBySlot, slot) => ({
    ...parametersBySlot,
    [slot]: slot === 'psu' && build[slot].catalogRevision === '2026-10-08-market-revalidation'
      ? { type: 'psu', wattage: build[slot].specs.watts, capacityOnly: true }
      : findPerformanceParametersByComponentId(build[slot].id)
  }), {});
}

function analyzeCpuGpuBalance(performanceParameters) {
  const cpuScore = performanceParameters.cpu.performanceScore;
  const gpuScore = performanceParameters.gpu.performanceScore;
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

function analyzeRamLimitations(performanceParameters) {
  const bottlenecks = [];
  const { capacity, speed, performanceScore } = performanceParameters.ram;

  if (capacity < bottleneckThresholds.minimumRamCapacityGb) {
    bottlenecks.push({
      type: 'ram_capacity_limitation',
      severity: capacity < 8 ? 'high' : 'medium',
      component: 'ram',
      relatedComponent: null,
      message: 'A capacidade de memoria RAM pode limitar multitarefas e jogos recentes.',
      technicalDetails: {
        capacityGb: capacity,
        minimumRecommendedGb: bottleneckThresholds.minimumRamCapacityGb,
        ramScore: performanceScore
      }
    });
  }

  if (speed < bottleneckThresholds.minimumRamSpeedMhz) {
    bottlenecks.push({
      type: 'ram_speed_limitation',
      severity: 'low',
      component: 'ram',
      relatedComponent: 'cpu',
      message: 'A velocidade da memoria RAM pode reduzir parte do desempenho do processador.',
      technicalDetails: {
        speedMhz: speed,
        minimumRecommendedMhz: bottleneckThresholds.minimumRamSpeedMhz,
        ramScore: performanceScore
      }
    });
  }

  return bottlenecks;
}

function analyzeStorageLimitations(performanceParameters) {
  const { performanceScore, readSpeed, interface: storageInterface } = performanceParameters.storage;
  const isLowScore = performanceScore < bottleneckThresholds.minimumStorageScore;
  const isSlowRead = readSpeed < bottleneckThresholds.minimumStorageReadSpeedMbS;

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
      readSpeedMbS: readSpeed,
      storageInterface,
      minimumRecommendedScore: bottleneckThresholds.minimumStorageScore,
      minimumRecommendedReadSpeedMbS: bottleneckThresholds.minimumStorageReadSpeedMbS
    }
  };
}

function analyzePsuHeadroom(performanceParameters, coolingPower) {
  const estimatedConsumptionWatts = calculateEstimatedConsumptionWatts(performanceParameters) + coolingPower.knownWatts;
  const psuWatts = performanceParameters.psu.wattage;
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

function validatePerformanceParameters(performanceParameters) {
  const errors = requiredPerformanceParameterSlots
    .filter((slot) => !performanceParameters[slot])
    .map((slot) => `Parametros de desempenho nao encontrados para ${slot}.`);

  if (errors.length === 0) {
    errors.push(...validatePerformanceParameterTypes(performanceParameters));
  }

  if (errors.length === 0) {
    errors.push(...componentsWithRequiredPerformanceScore
      .filter((slot) => !isValidScore(performanceParameters[slot].performanceScore))
      .map((slot) => `Parametro de desempenho ausente ou invalido para ${slot}: performanceScore.`));
  }

  if (performanceParameters.ram && !isValidNumber(performanceParameters.ram.capacity)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: capacity.');
  }

  if (performanceParameters.ram && !isValidNumber(performanceParameters.ram.speed)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: speed.');
  }

  if (performanceParameters.storage && !isValidNumber(performanceParameters.storage.readSpeed)) {
    errors.push('Parametro de desempenho ausente ou invalido para storage: readSpeed.');
  }

  if (performanceParameters.cpu && !isValidNumber(performanceParameters.cpu.tdp)) {
    errors.push('Parametro de consumo ausente ou invalido para cpu: tdp.');
  }

  if (performanceParameters.gpu && !isValidNumber(performanceParameters.gpu.tdp)) {
    errors.push('Parametro de consumo ausente ou invalido para gpu: tdp.');
  }

  if (performanceParameters.psu && !isValidNumber(performanceParameters.psu.wattage)) {
    errors.push('Parametro de consumo ausente ou invalido para psu: wattage.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Parametros de desempenho insuficientes para analise de gargalos.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function validatePerformanceParameterTypes(performanceParameters) {
  return requiredPerformanceParameterSlots
    .filter((slot) => performanceParameters[slot].type !== slot)
    .map((slot) => `Parametros de desempenho de ${slot} estao cadastrados com tipo ${performanceParameters[slot].type}.`);
}

function buildPerformanceSummary(performanceParameters, coolingPower, hasCooling) {
  return {
    cpuScore: performanceParameters.cpu.performanceScore,
    gpuScore: performanceParameters.gpu.performanceScore,
    ramScore: performanceParameters.ram.performanceScore,
    storageScore: performanceParameters.storage.performanceScore,
    estimatedConsumptionWatts: calculateEstimatedConsumptionWatts(performanceParameters) + coolingPower.knownWatts,
    ...(performanceParameters.gpu.tdpBasis ? { gpuPowerEstimateBasis: performanceParameters.gpu.tdpBasis,
      gpuBoardPowerVerified: false } : {}),
    ...(hasCooling ? { coolingPowerWatts: coolingPower.knownWatts, powerEstimateComplete: coolingPower.complete, unknownPowerComponents: coolingPower.unknownComponents } : {}),
    psuWatts: performanceParameters.psu.wattage
  };
}

function isValidScore(value) {
  return isValidNumber(value) && value >= 0 && value <= 100;
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
