import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { createSyntheticPerformanceParameter } from '../data/synthetic-performance-profiles.js';
import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';

export const corePerformanceCategories = ['cpu', 'gpu', 'ram', 'storage'];

export function isValidCorePerformanceParameter(component, parameter) {
  if (!parameter || (parameter.type !== undefined && parameter.type !== component.category)) return false;
  if (parameter.componentId !== undefined && parameter.componentId !== component.id) return false;
  const validScore = score => Number.isFinite(score) && score >= 0 && score <= 100;
  return validScore(parameter.performanceScore)
    && ['gamingScore', 'productivityScore'].every(field => parameter[field] === undefined || parameter[field] === null || validScore(parameter[field]));
}

export function isUsableScoreParameter(component, parameter) {
  return isValidCorePerformanceParameter(component, parameter)
    && (component.performanceModelStatus !== 'unavailable'
      || isRegisteredSyntheticParameter(component, parameter)
      || hasVerifiedMeasurementEvidence(parameter, component));
}

export function isRegisteredSyntheticParameter(component, parameter) {
  const expected = createSyntheticPerformanceParameter(component);
  return Boolean(expected && parameter?.scoreKind === expected.scoreKind
    && parameter.modelVersion === expected.modelVersion
    && parameter.simulationSupported === false
    && ['performanceScore', 'gamingScore', 'productivityScore'].every(key => parameter[key] === expected[key]));
}

export function performanceMeasurementIdentity(component) {
  return createHash('sha256').update(JSON.stringify([
    component?.id, component?.name, component?.brand, component?.category,
    component?.partNumber ?? null, component?.specs ?? null
  ])).digest('hex');
}

export function hasVerifiedMeasurementEvidence(parameter, component) {
  const evidence = parameter?.measurementEvidence;
  return parameter?.scoreBasis === 'measured' && parameter.measuredBenchmark === true
    && evidence?.reviewStatus === 'verified'
    && Boolean(component?.id) && parameter.componentId === component.id
    && evidence.componentIdentity === performanceMeasurementIdentity(component)
    && isHttpsSource(evidence.sourceUrl)
    && ['metric', 'methodology', 'observedAt'].every(key => typeof evidence[key] === 'string' && evidence[key].trim())
    && Number.isFinite(evidence.value)
    && isStrictObservationTimestamp(evidence.observedAt);
}

function isHttpsSource(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && Boolean(url.hostname); }
  catch { return false; }
}

function isStrictObservationTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value.replace(/(?<!\.\d{3})Z$/, '.000Z');
}

export function isSimulationParameterUsable(component, parameter) {
  return isUsableScoreParameter(component, parameter)
    && parameter.simulationSupported === true
    && typeof parameter.simulationProfileVersion === 'string'
    && parameter.simulationProfileVersion.trim().length > 0;
}

// A score-only coefficient is useful for ranking, but cannot unlock a simulation.
export function unavailablePerformance(components) {
  const componentIds = Object.values(components).flat()
    .filter((component) => {
      if (!component) return false;
      const parameter = findPerformanceParameterRecordByComponentId(component.id);
      return corePerformanceCategories.includes(component.category)
        ? !isSimulationParameterUsable(component, parameter)
        : component.performanceModelStatus === 'unavailable';
    })
    .map((component) => component.id);
  if (!componentIds.length) return null;
  const provisional = componentIds.some(id => {
    const parameter = findPerformanceParameterRecordByComponentId(id);
    return parameter?.scoreKind === 'synthetic-provisional' || parameter?.scoreBasis === 'measured';
  });
  return {
    available: false,
    performanceBasis: 'simulated',
    scoreOnly: provisional,
    reason: provisional ? 'synthetic_model_not_simulation_calibrated' : 'performance_model_unavailable',
    message: 'Estimativa de desempenho indisponível para este modelo.',
    componentsWithoutPerformanceModel: componentIds
  };
}

export function bottleneckVerdict(analysis) {
  return analysis?.available !== false && typeof analysis?.hasBottleneck === 'boolean'
    ? analysis.hasBottleneck : null;
}
