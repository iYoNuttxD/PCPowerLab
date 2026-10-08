import { unavailablePerformance } from '../utils/performanceAvailability.js';
import { normalizeSelectedComponentIds } from './build.service.js';
import { validateSimulationCompatibility } from './simulationCompatibilityService.js';
import { professionalSoftware } from '../data/professionalSoftware.js';
import { findComponentById } from './component.service.js';
import { findPerformanceParametersByComponentId } from './performanceParametersService.js';
import {
  getRamRequirementStatus,
  getRequirementStatus
} from '../utils/performanceSimulationUtils.js';

const requiredSoftwareSimulationSlots = ['cpu', 'gpu', 'ram', 'storage'];

export function listProfessionalSoftware(filters = {}) {
  const category = normalizeOptionalText(filters.category);

  return professionalSoftware.filter((software) => (
    !category || software.category.toLowerCase() === category
  ));
}

export function findProfessionalSoftwareById(softwareId) {
  return professionalSoftware.find((software) => software.id === softwareId) || null;
}

export function simulateProfessionalSoftwarePerformance(simulationInput) {
  validateSimulationPayload(simulationInput);

  const software = findProfessionalSoftwareById(normalizeRequiredText(simulationInput.softwareId, 'softwareId'));

  if (!software) {
    const error = new Error('Software profissional nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const compatibility = validateSimulationCompatibility(simulationInput.build);
  const buildInput = normalizeSelectedComponentIds(simulationInput.build);
  const components = mapSimulationComponents(buildInput);
  const unavailable = unavailablePerformance(components);
  if (unavailable) return { ...unavailable, software: software.name, softwareId: software.id, category: software.category, performanceScore: null, performanceLevel: 'unavailable', meetsMinimumRequirements: null, meetsRecommendedRequirements: null, summary: unavailable.message, technicalDetails: { compatibility, weightedPerformanceIndex: null } };
  const performanceParameters = mapPerformanceParameters(components);
  const details = buildRequirementDetails({ software, performanceParameters });
  const meetsMinimumRequirements = Object.values(details).every((status) => status !== 'belowMinimum');
  const meetsRecommendedRequirements = Object.values(details).every((status) => status === 'recommended');
  const performanceScore = calculateSoftwarePerformanceScore({ software, performanceParameters });
  const performanceLevel = getSoftwarePerformanceLevel({
    performanceScore,
    meetsMinimumRequirements,
    meetsRecommendedRequirements
  });

  return {
    software: software.name,
    softwareId: software.id,
    category: software.category,
    performanceScore,
    performanceLevel,
    meetsMinimumRequirements,
    meetsRecommendedRequirements,
    details,
    summary: buildSoftwareSummary({
      software,
      performanceLevel,
      meetsRecommendedRequirements,
      meetsMinimumRequirements
    }),
    technicalDetails: {
      compatibility,
      weights: {
        cpuWeight: software.cpuWeight,
        gpuWeight: software.gpuWeight,
        ramWeight: software.ramWeight,
        storageWeight: software.storageWeight
      }
    }
  };
}

function validateSimulationPayload(simulationInput) {
  if (!simulationInput || typeof simulationInput !== 'object' || Array.isArray(simulationInput)) {
    const error = new Error('Informe os dados da simulacao em software profissional.');
    error.statusCode = 400;
    throw error;
  }

  if (!simulationInput.build || typeof simulationInput.build !== 'object' || Array.isArray(simulationInput.build)) {
    const error = new Error('Informe os componentes da build para simulacao em software profissional.');
    error.statusCode = 400;
    throw error;
  }
}


function mapSimulationComponents(buildInput) {
  return requiredSoftwareSimulationSlots.reduce((componentsBySlot, slot) => {
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
  const parametersBySlot = requiredSoftwareSimulationSlots.reduce((parameters, slot) => ({
    ...parameters,
    [slot]: findPerformanceParametersByComponentId(components[slot].id)
  }), {});

  validatePerformanceParameters(parametersBySlot);

  return parametersBySlot;
}

function validatePerformanceParameters(performanceParameters) {
  const errors = requiredSoftwareSimulationSlots
    .filter((slot) => !performanceParameters[slot])
    .map((slot) => `Parametros de desempenho nao encontrados para ${slot}.`);

  if (errors.length === 0) {
    errors.push(...requiredSoftwareSimulationSlots
      .filter((slot) => performanceParameters[slot].type !== slot)
      .map((slot) => `Parametros de desempenho de ${slot} estao cadastrados com tipo ${performanceParameters[slot].type}.`));
  }

  if (errors.length === 0) {
    errors.push(...requiredSoftwareSimulationSlots
      .filter((slot) => !isValidScore(performanceParameters[slot].performanceScore))
      .map((slot) => `Parametro de desempenho ausente ou invalido para ${slot}: performanceScore.`));
  }

  if (performanceParameters.ram && !isValidNumber(performanceParameters.ram.capacity)) {
    errors.push('Parametro de desempenho ausente ou invalido para ram: capacity.');
  }

  if (errors.length === 0) {
    return;
  }

  const error = new Error('Parametros de desempenho insuficientes para simulacao em software profissional.');
  error.statusCode = 400;
  error.errors = errors;
  throw error;
}

function buildRequirementDetails({ software, performanceParameters }) {
  const cpuScore = getProductivityScore(performanceParameters.cpu);
  const gpuScore = getProductivityScore(performanceParameters.gpu);

  return {
    cpuStatus: getRequirementStatus(cpuScore, software.minimumCpuScore, software.recommendedCpuScore),
    gpuStatus: getRequirementStatus(gpuScore, software.minimumGpuScore, software.recommendedGpuScore),
    ramStatus: getRamRequirementStatus(
      performanceParameters.ram.capacity,
      software.minimumRamGb,
      software.recommendedRamGb
    ),
    storageStatus: getRequirementStatus(
      performanceParameters.storage.performanceScore,
      software.minimumStorageScore,
      software.recommendedStorageScore
    )
  };
}

function calculateSoftwarePerformanceScore({ software, performanceParameters }) {
  const cpuIndex = normalizeRequirementRatio(getProductivityScore(performanceParameters.cpu), software.recommendedCpuScore);
  const gpuIndex = normalizeRequirementRatio(getProductivityScore(performanceParameters.gpu), software.recommendedGpuScore);
  const ramIndex = normalizeRequirementRatio(performanceParameters.ram.capacity, software.recommendedRamGb);
  const storageIndex = normalizeRequirementRatio(
    performanceParameters.storage.performanceScore,
    software.recommendedStorageScore
  );

  const score = (cpuIndex * software.cpuWeight)
    + (gpuIndex * software.gpuWeight)
    + (ramIndex * software.ramWeight)
    + (storageIndex * software.storageWeight);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSoftwarePerformanceLevel({
  performanceScore,
  meetsMinimumRequirements,
  meetsRecommendedRequirements
}) {
  if (!meetsMinimumRequirements || performanceScore < 40) {
    return 'Insuficiente';
  }

  if (performanceScore >= 90 && meetsRecommendedRequirements) {
    return 'Excelente';
  }

  if (performanceScore >= 75) {
    return 'Muito bom';
  }

  if (performanceScore >= 60) {
    return 'Bom';
  }

  return 'Basico';
}

function buildSoftwareSummary({
  software,
  performanceLevel,
  meetsRecommendedRequirements,
  meetsMinimumRequirements
}) {
  if (!meetsMinimumRequirements) {
    return `A configuracao fica abaixo do minimo estimado para ${software.name}.`;
  }

  if (meetsRecommendedRequirements) {
    return `A configuracao deve apresentar ${performanceLevel.toLowerCase()} desempenho para ${software.name}. ${software.description}`;
  }

  return `A configuracao atende ao minimo para ${software.name}, mas fica abaixo do recomendado em alguns criterios. ${software.description}`;
}

function getProductivityScore(performanceParameter) {
  return performanceParameter.productivityScore ?? performanceParameter.performanceScore;
}

function normalizeRequirementRatio(value, recommendedValue) {
  if (!Number.isFinite(value) || !Number.isFinite(recommendedValue) || recommendedValue <= 0) {
    return 0;
  }

  return Math.min((value / recommendedValue) * 100, 120);
}

function normalizeRequiredText(value, fieldName) {
  if (!isFilledText(value)) {
    const error = new Error('Dados obrigatorios ausentes para simulacao em software profissional.');
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
