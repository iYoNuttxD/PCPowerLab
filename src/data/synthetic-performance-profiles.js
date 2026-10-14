// User-authorized invented coefficients, isolated from manufacturer specifications.
// These profiles support score/ranking comparisons only, never measured FPS or power.
export const syntheticScoreModelVersion = 'synthetic-catalog-v1';
const gpu = (partNumber, score, vramGb, className) => ({ partNumber, score, inputs: { vramGb }, className });
export const syntheticPerformanceProfiles = {
  'gpu-msi-rtx-3050-lp-6g-oc': gpu('G3050LP6C', 45, 6, 'RTX 3050 6GB; distinct from the 8GB model'),
  'gpu-gigabyte-rtx-5060-ti-eagle-oc-ice-8g': gpu('GV-N506TEAGLEOC ICE-8GD', 86, 8, 'RTX 5060 Ti 8GB'),
  'gpu-gigabyte-rtx-5070-windforce-oc-sff-12g': gpu('GV-N5070WF3OC-12GD', 94, 12, 'RTX 5070 12GB'),
  'gpu-asrock-rx-9060-xt-challenger-16g-oc': gpu('90-GA5QZZ-00UANF', 86, 16, 'RX 9060 XT 16GB'),
  'gpu-xfx-rx-9070-xt-swift-white-16g': gpu('RX-97TSWF3W9', 97, 16, 'RX 9070 XT 16GB'),
  'cpu-intel-i5-14600k-box': { partNumber: 'BX8071514600K', score: 90, inputs: { performanceCores: 6, efficientCores: 8, threads: 20 }, className: '6P+8E / 20 threads; existing i5-13600K general-score anchor, no generation uplift' },
  'ram-ax5u6000c4816g-slabrbk': { partNumber: 'AX5U6000C4816G-SLABRBK', score: 68, inputs: { capacityGb: 16, speedMhz: 6000, casLatency: 48, nominalCasLatencyNs: 16 }, className: 'DDR5 single 16GB 6000 CL48', formula: 'min(92, 50 + capacityGb/2 + (speedMhz-3200)/200) - max(0, nominalCasLatencyNs-12)' },
  'hdd-st2000dm008': { partNumber: 'ST2000DM008', score: 25, inputs: { storageType: 'HDD', interface: 'SATA', rpm: 7200 }, className: 'SATA mechanical 7200-rpm class; existing HDD general-score anchor' }
};

export function createSyntheticPerformanceParameter(component) {
  const profile = syntheticPerformanceProfiles[component?.id];
  if (!profile || component.partNumber !== profile.partNumber
    || Object.entries(profile.inputs).some(([key, value]) => component.specs?.[key] !== value)) return null;
  return {
    componentId: component.id, type: component.category,
    performanceScore: profile.score, gamingScore: profile.score, productivityScore: profile.score,
    scoreKind: 'synthetic-provisional', scoreBasis: 'simulated', modelVersion: syntheticScoreModelVersion,
    simulationSupported: false, measuredBenchmark: false, confidence: 'low',
    scoreInputs: { ...profile.inputs }, scoreClass: profile.className,
    scoreFormula: profile.formula || 'Explicit versioned class coefficient; no measured benchmark derivation or factory-OC bonus',
    specSourceUrls: [component.specSourceUrl, ...(component.additionalSpecSourceUrls || [])].filter(Boolean),
    specVerifiedAt: component.specVerifiedAt,
    scoreDisclaimer: 'Pontuação simulada provisória; coeficiente inventado, não é benchmark nem FPS medido.',
    scoreLimitations: 'Somente índice comparativo. Não comprova desempenho, gargalo, requisitos de software, consumo, temperatura ou FPS. Especificações técnicas permanecem separadas e não são inventadas.'
  };
}
