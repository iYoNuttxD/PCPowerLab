import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';
import { corePerformanceCategories, hasVerifiedMeasurementEvidence } from './performanceAvailability.js';

// Aggregate scores are model outputs, even when an input has measured evidence.
// Metadata never grants eligibility for FPS, software or bottleneck simulation.
export function performanceMetadata(components = {}, parameters = new Map()) {
  const contributors = Object.values(components).flat().filter(component => component?.id && corePerformanceCategories.includes(component.category))
    .map(component => {
      const parameter = parameters.get(component.id) ?? findPerformanceParameterRecordByComponentId(component.id);
      const metadata = component.performanceMethodology;
      const kind = parameter?.scoreKind ?? metadata?.kind ?? 'catalog-simulated';
      const measured = hasVerifiedMeasurementEvidence(parameter, component);
      return { componentId: component.id, basis: measured ? 'measured' : 'simulated', kind,
        modelVersion: parameter?.modelVersion ?? metadata?.modelVersion ?? 'catalog-estimate-v1' };
    });
  const provisional = contributors.filter(item => item.kind === 'synthetic-provisional');
  return {
    performanceBasis: 'simulated',
    performanceMethodology: {
      basis: 'simulated',
      kind: provisional.length ? 'synthetic-provisional' : 'catalog-simulated',
      modelVersion: provisional.length ? 'synthetic-catalog-v1' : 'catalog-estimate-v1',
      shortLabel: provisional.length ? 'Score simulado provisório' : 'Score simulado',
      measuredBenchmark: false,
      provisionalComponentIds: provisional.map(item => item.componentId),
      contributors,
      description: 'Índice calculado por modelo, não benchmark medido nem garantia de desempenho. Perfis provisórios permitem apenas scores; não habilitam FPS, software ou análise de gargalos.'
    }
  };
}
