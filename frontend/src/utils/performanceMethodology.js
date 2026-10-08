// Recognize the current API contract and earlier internal-model responses.
// This describes a score's origin; it never enables FPS/software simulation.
export function hasSimulatedPerformance(...sources) {
  return sources.some(source => [
    source?.performanceBasis,
    source?.performanceMethodology?.basis,
    source?.methodology?.performance?.basis
  ].some(basis => basis === 'simulated' || basis === 'simulated_catalog_parameters'));
}

export function performanceScoreLabel(...sources) {
  return hasSimulatedPerformance(...sources) ? 'Pontuação simulada' : 'Pontuação estimada';
}
