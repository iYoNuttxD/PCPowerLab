import { games } from '../data/games.js';
import { findComponentById } from './component.service.js';
import { findPerformanceParametersByComponentId } from './performanceParametersService.js';
import { analyzeBuildBottlenecks } from './bottleneck.service.js';
import {
  buildPerformanceSummaryMessage,
  calculateWeightedPerformanceIndex,
  estimateFps,
  getBottleneckPenalty,
  getPerformanceLevel,
  getQualityPresetMultiplier,
  getRamRequirementStatus,
  getRequirementStatus,
  getResolutionMultiplier,
  supportedQualityPresets,
  supportedTargetResolutions
} from '../utils/performanceSimulationUtils.js';

const requiredSimulationSlots = ['cpu', 'gpu', 'ram', 'storage'];
const fullBuildSlots = ['cpu', 'motherboard', 'gpu', 'ram', 'storage', 'psu', 'case'];
const maxGamesPerComparison = 10;

export function listGames(filters = {}) {
  const category = normalizeOptionalText(filters.category);

  return games.filter((game) => !category || game.category.toLowerCase() === category);
}

export function findGameById(gameId) {
  return games.find((game) => game.id === gameId) || null;
}

export function simulateGamePerformance(simulationInput) {
  validateSimulationPayload(simulationInput);

  const game = findGameById(normalizeRequiredText(simulationInput.gameId, 'gameId'));

  if (!game) {
    const error = new Error('Jogo nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const targetResolution = normalizeTargetResolution(simulationInput.targetResolution ?? game.targetResolution);
  const qualityPreset = normalizeQualityPreset(simulationInput.qualityPreset);
  const buildInput = normalizeBuildInput(simulationInput.build);
  const components = mapSimulationComponents(buildInput);
  const performanceParameters = mapPerformanceParameters(components);
  const details = buildRequirementDetails({ game, performanceParameters });
  const meetsMinimumRequirements = Object.values(details).every((status) => status !== 'belowMinimum');
  const meetsRecommendedRequirements = Object.values(details).every((status) => status === 'recommended');
  const bottleneckAnalysis = analyzeBottlenecksWhenBuildIsComplete(buildInput);
  const bottleneckPenalty = getBottleneckPenalty(bottleneckAnalysis);
  const weightedPerformanceIndex = calculateWeightedPerformanceIndex({
    cpuScore: getGamingScore(performanceParameters.cpu),
    gpuScore: getGamingScore(performanceParameters.gpu),
    ramCapacityGb: performanceParameters.ram.capacity,
    storageScore: performanceParameters.storage.performanceScore,
    game
  });
  const estimatedFps = estimateFps({
    baseFpsReference: game.baseFpsReference,
    weightedPerformanceIndex,
    targetResolution,
    qualityPreset,
    bottleneckPenalty
  });
  const performanceLevel = getPerformanceLevel({
    estimatedFps,
    meetsMinimumRequirements,
    meetsRecommendedRequirements
  });

  return {
    game: game.name,
    gameId: game.id,
    targetResolution,
    qualityPreset,
    estimatedFps,
    performanceLevel,
    meetsMinimumRequirements,
    meetsRecommendedRequirements,
    summary: buildPerformanceSummaryMessage({
      gameName: game.name,
      qualityPreset,
      performanceLevel,
      meetsRecommendedRequirements
    }),
    details,
    technicalDetails: {
      weightedPerformanceIndex: Number(weightedPerformanceIndex.toFixed(2)),
      qualityMultiplier: getQualityPresetMultiplier(qualityPreset),
      resolutionMultiplier: getResolutionMultiplier(targetResolution),
      bottleneckPenalty,
      bottlenecks: bottleneckAnalysis?.bottlenecks ?? []
    }
  };
}

export function compareGamePerformance(comparisonInput) {
  validateComparisonPayload(comparisonInput);

  const gameIds = comparisonInput.gameIds.map((gameId) => normalizeRequiredText(gameId, 'gameId'));
  const invalidGameIds = gameIds.filter((gameId) => !findGameById(gameId));

  if (invalidGameIds.length > 0) {
    const error = new Error('Um ou mais jogos nao foram encontrados.');
    error.statusCode = 404;
    error.errors = invalidGameIds.map((gameId) => `Jogo nao encontrado: ${gameId}.`);
    throw error;
  }

  const simulations = gameIds.map((gameId) => simulateGamePerformance({
    gameId,
    targetResolution: comparisonInput.targetResolution,
    qualityPreset: comparisonInput.qualityPreset,
    build: comparisonInput.build
  }));

  return {
    targetResolution: simulations[0].targetResolution,
    qualityPreset: simulations[0].qualityPreset,
    results: simulations.map(formatGameComparisonResult),
    summary: buildGameComparisonSummary(simulations)
  };
}

function mapSimulationComponents(buildInput) {
  return requiredSimulationSlots.reduce((componentsBySlot, slot) => {
    const componentId = normalizeRequiredText(buildInput[`${slot}Id`] ?? buildInput[slot], `${slot}Id`);
    const component = findComponentById(componentId);

    if (!component) {
      const error = new Error('Um ou mais componentes selecionados nao foram encontrados.');
      error.statusCode = 404;
      error.errors = [`Componente nao encontrado para ${slot}: ${componentId}.`];
      throw error;
    }

    if (component.category !== slot) {
      const error = new Error('Componente selecionado em categoria incorreta.');
      error.statusCode = 400;
      error.errors = [`O componente ${component.name} pertence a categoria ${component.category}, nao a ${slot}.`];
      throw error;
    }

    return {
      ...componentsBySlot,
      [slot]: component
    };
  }, {});
}

function mapPerformanceParameters(components) {
  const parametersBySlot = requiredSimulationSlots.reduce((parameters, slot) => ({
    ...parameters,
    [slot]: findPerformanceParametersByComponentId(components[slot].id)
  }), {});

  validatePerformanceParameters(parametersBySlot);

  return parametersBySlot;
}

function buildRequirementDetails({ game, performanceParameters }) {
  const cpuScore = getGamingScore(performanceParameters.cpu);
  const gpuScore = getGamingScore(performanceParameters.gpu);

  return {
    cpuStatus: getRequirementStatus(cpuScore, game.minimumCpuScore, game.recommendedCpuScore),
    gpuStatus: getRequirementStatus(gpuScore, game.minimumGpuScore, game.recommendedGpuScore),
    ramStatus: getRamRequirementStatus(
      performanceParameters.ram.capacity,
      game.minimumRamGb,
      game.recommendedRamGb
    ),
    storageStatus: getRequirementStatus(performanceParameters.storage.performanceScore, 40, 70)
  };
}

function analyzeBottlenecksWhenBuildIsComplete(buildInput) {
  const hasFullBuild = fullBuildSlots.every((slot) => isFilledText(buildInput[`${slot}Id`] ?? buildInput[slot]));

  if (!hasFullBuild) {
    return null;
  }

  return analyzeBuildBottlenecks(buildInput);
}

function validatePerformanceParameters(performanceParameters) {
  const errors = requiredSimulationSlots
    .filter((slot) => !performanceParameters[slot])
    .map((slot) => `Parametros de desempenho nao encontrados para ${slot}.`);

  if (errors.length === 0) {
    errors.push(...requiredSimulationSlots
      .filter((slot) => performanceParameters[slot].type !== slot)
      .map((slot) => `Parametros de desempenho de ${slot} estao cadastrados com tipo ${performanceParameters[slot].type}.`));
  }

  if (errors.length === 0) {
    errors.push(...requiredSimulationSlots
      .filter((slot) => !isValidScore(performanceParameters[slot].performanceScore))
      .map((slot) => `Parametro de desempenho ausente ou invalido para ${slot}: performanceScore.`));
  }

  if (performanceParameters.ram && !isValidNumber(performanceParameters.ram.capacity)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: capacity.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Parametros de desempenho insuficientes para simulacao de jogos.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function validateSimulationPayload(simulationInput) {
  if (!simulationInput || typeof simulationInput !== 'object' || Array.isArray(simulationInput)) {
    const error = new Error('Informe os dados da simulacao de desempenho.');
    error.statusCode = 400;
    throw error;
  }

  if (!simulationInput.build || typeof simulationInput.build !== 'object' || Array.isArray(simulationInput.build)) {
    const error = new Error('Informe os componentes da build para simulacao.');
    error.statusCode = 400;
    throw error;
  }
}

function validateComparisonPayload(comparisonInput) {
  if (!comparisonInput || typeof comparisonInput !== 'object' || Array.isArray(comparisonInput)) {
    const error = new Error('Informe os dados da comparacao de desempenho entre jogos.');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(comparisonInput.gameIds)) {
    const error = new Error('gameIds deve ser um array.');
    error.statusCode = 400;
    throw error;
  }

  if (comparisonInput.gameIds.length < 2) {
    const error = new Error('Informe pelo menos dois jogos para comparar.');
    error.statusCode = 400;
    throw error;
  }

  if (comparisonInput.gameIds.length > maxGamesPerComparison) {
    const error = new Error('Limite maximo de jogos por comparacao excedido.');
    error.statusCode = 400;
    error.errors = [`Informe no maximo ${maxGamesPerComparison} jogos por comparacao.`];
    throw error;
  }
}

function formatGameComparisonResult(simulation) {
  return {
    gameId: simulation.gameId,
    gameName: simulation.game,
    estimatedFps: simulation.estimatedFps,
    performanceLevel: simulation.performanceLevel,
    meetsMinimumRequirements: simulation.meetsMinimumRequirements,
    meetsRecommendedRequirements: simulation.meetsRecommendedRequirements
  };
}

function buildGameComparisonSummary(simulations) {
  const excellentCount = simulations.filter((simulation) => simulation.performanceLevel === 'excellent').length;
  const goodCount = simulations.filter((simulation) => simulation.performanceLevel === 'good').length;
  const insufficientCount = simulations.filter((simulation) => simulation.performanceLevel === 'insufficient').length;
  const averageFps = Math.round(
    simulations.reduce((total, simulation) => total + simulation.estimatedFps, 0) / simulations.length
  );

  if (insufficientCount > 0) {
    return `A configuracao apresenta media estimada de ${averageFps} FPS, mas pode ficar abaixo do minimo em ${insufficientCount} jogo(s).`;
  }

  if (excellentCount === simulations.length) {
    return `A configuracao apresenta desempenho excelente nos ${simulations.length} jogos comparados, com media estimada de ${averageFps} FPS.`;
  }

  if (excellentCount + goodCount === simulations.length) {
    return `A configuracao apresenta desempenho bom ou excelente nos jogos comparados, com media estimada de ${averageFps} FPS.`;
  }

  return `A configuracao apresenta desempenho variado nos jogos comparados, com media estimada de ${averageFps} FPS.`;
}

function normalizeBuildInput(buildInput) {
  return requiredSimulationSlots.reduce((normalizedBuild, slot) => ({
    ...normalizedBuild,
    [`${slot}Id`]: buildInput[`${slot}Id`] ?? buildInput[slot]
  }), {
    motherboardId: buildInput.motherboardId ?? buildInput.motherboard,
    psuId: buildInput.psuId ?? buildInput.psu,
    caseId: buildInput.caseId ?? buildInput.case
  });
}

function normalizeTargetResolution(targetResolutionInput) {
  const targetResolution = normalizeRequiredText(targetResolutionInput, 'targetResolution').toLowerCase();

  if (supportedTargetResolutions.includes(targetResolution)) {
    return targetResolution;
  }

  const error = new Error('Resolucao alvo invalida.');
  error.statusCode = 400;
  error.errors = [`Resolucoes aceitas: ${supportedTargetResolutions.join(', ')}.`];
  throw error;
}

function normalizeQualityPreset(qualityPresetInput) {
  const qualityPreset = normalizeOptionalText(qualityPresetInput) || 'medium';

  if (supportedQualityPresets.includes(qualityPreset)) {
    return qualityPreset;
  }

  const error = new Error('Preset de qualidade invalido.');
  error.statusCode = 400;
  error.errors = [`Presets aceitos: ${supportedQualityPresets.join(', ')}.`];
  throw error;
}

function getGamingScore(performanceParameter) {
  return performanceParameter.gamingScore ?? performanceParameter.performanceScore;
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatorios ausentes para simulacao de desempenho.');
    error.statusCode = 400;
    error.errors = [`${fieldName} deve ser informado.`];
    throw error;
  }

  return value.trim();
}

function normalizeOptionalText(value) {
  if (!isFilledText(value)) {
    return null;
  }

  return value.trim().toLowerCase();
}

function isFilledText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidScore(value) {
  return isValidNumber(value) && value >= 0 && value <= 100;
}

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
