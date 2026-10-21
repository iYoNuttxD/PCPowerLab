import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';
import { estimatedParameter, estimatedIntegratedGraphics } from '../utils/estimatedPerformance.js';
import { usesIntegratedGraphics } from '../utils/graphicsSelection.js';

export function estimateParameter(component) {
  return estimatedParameter(component, findPerformanceParameterRecordByComponentId(component?.id));
}
export function estimateBuildParameters(components, slots) {
  const integrated = usesIntegratedGraphics(components);
  return Object.fromEntries(slots.map(slot => {
    const parameter = slot === 'gpu' && integrated ? estimatedIntegratedGraphics(components.cpu, components.ram) : estimateParameter(components[slot]);
    if (slot === 'ram' && integrated && parameter) return [slot, { ...parameter, systemCapacityGb:parameter.capacity, capacity:Math.max(1, parameter.capacity - 2), sharedMemoryReserveGb:2, assumptions:[...(parameter.assumptions || []), 'Reserva gráfica de 2 GB deduzida da RAM disponível no cenário; a alocação real é dinâmica.'] }];
    return [slot, parameter];
  }));
}
