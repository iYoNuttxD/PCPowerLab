import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';

export const corePerformanceCategories = ['cpu', 'gpu', 'ram', 'storage'];

export function isValidCorePerformanceParameter(component, parameter) {
  if (!parameter || (parameter.type !== undefined && parameter.type !== component.category)) return false;
  if (parameter.componentId !== undefined && parameter.componentId !== component.id) return false;
  const validScore = score => Number.isFinite(score) && score >= 0 && score <= 100;
  return validScore(parameter.performanceScore)
    && ['gamingScore', 'productivityScore'].every(field => parameter[field] === undefined || parameter[field] === null || validScore(parameter[field]));
}

// Missing or invalid model data is unknown, never a zero score or a measured result.
export function unavailablePerformance(components) {
  const componentIds = Object.values(components).flat()
    .filter((component) => component && (component.performanceModelStatus === 'unavailable'
      || (corePerformanceCategories.includes(component.category)
        && !isValidCorePerformanceParameter(component, findPerformanceParameterRecordByComponentId(component.id)))))
    .map((component) => component.id);
  if (!componentIds.length) return null;
  return {
    available: false,
    reason: 'performance_model_unavailable',
    message: 'Estimativa de desempenho indisponível para este modelo.',
    componentsWithoutPerformanceModel: componentIds
  };
}

export function bottleneckVerdict(analysis) {
  return analysis?.available !== false && typeof analysis?.hasBottleneck === 'boolean'
    ? analysis.hasBottleneck : null;
}
