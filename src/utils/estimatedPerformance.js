// Scenario coefficients, not measurements. Family approximations deliberately
// carry wider ranges than the existing catalogue model. Specifications stay intact.
export const ESTIMATE_MODEL_VERSION = 'component-scenario-v2';
const clamp = (n, lo = 1, hi = 100) => Math.max(lo, Math.min(hi, n));
const number = (n, fallback) => Number.isFinite(n) && n > 0 ? n : fallback;
const families = [
  [/9900X/i, 95, 90, 98], [/7800X3D/i, 94, 98, 83], [/3200G/i, 34, 32, 30], [/4500/i, 52, 49, 50],
  [/RTX.?5060.?Ti/i, 86, 86, 86], [/RTX.?5060(?!.*Ti)/i, 77, 77, 77],
  [/RX.?7600/i, 69, 69, 66], [/A380/i, 29, 27, 38], [/RX.?550/i, 16, 16, 14]
];
export function estimatedParameter(component, registered) {
  if (!component) return null;
  const s = component.specs || {};
  const validScore = value => Number.isFinite(value) && value >= 0 && value <= 100;
  const valid = registered && registered.type === component.category
    && (registered.componentId === undefined || registered.componentId === component.id)
    && validScore(registered.performanceScore)
    && ['gamingScore', 'productivityScore'].every(key => registered[key] == null || validScore(registered[key]));
  const family = ['cpu', 'gpu'].includes(component.category) ? families.find(([pattern]) => pattern.test(component.name || '')) : null;
  let score = family?.[1] ?? (component.category === 'cpu' ? clamp(20 + number(s.threads, 8) * 2 + number(s.boostClockGhz, 3) * 4, 20, 92)
    : component.category === 'gpu' ? 50 : component.category === 'ram' ? clamp(45 + number(s.capacityGb, 16) / 2 + number(s.speedMhz, 3200) / 250)
      : component.category === 'storage' ? /HDD/i.test(s.storageType || component.name) ? 25 : /NVMe/i.test(s.interface || '') ? 80 : 65 : 50);
  if (valid) score = registered.performanceScore;
  const broadScenario = !valid || registered.simulationSupported !== true || !registered.simulationProfileVersion;
  return {
    ...(valid ? registered : {}), componentId: component.id, type: component.category,
    performanceScore: score, gamingScore: valid ? registered.gamingScore ?? score : family?.[2] ?? score,
    productivityScore: valid ? registered.productivityScore ?? score : family?.[3] ?? score,
    capacity: number(s.capacityGb, number(registered?.capacity, 16)),
    speed: number(s.speedMhz, number(registered?.speed, 3200)),
    readSpeed: number(s.readSpeedMbS, number(registered?.readSpeed, /HDD/i.test(s.storageType || component.name) ? 120 : /NVMe/i.test(s.interface || '') ? 3000 : 500)),
    tdp: number(s.tdpWatts, number(s.typicalBoardPowerWatts, number(registered?.tdp, component.category === 'gpu' ? score < 25 ? 50 : 150 : 65))),
    wattage: number(s.watts, number(registered?.wattage, 550)),
    estimated: true, heuristicFallback: Boolean(broadScenario), confidence: broadScenario ? 'low' : 'medium',
    estimateBasis: valid ? 'catalogue-model' : family ? 'chip-family-scenario' : 'generic-class-scenario',
    modelVersion: ESTIMATE_MODEL_VERSION,
    assumptions: broadScenario ? [valid ? 'Índice relativo usado como aproximação; não é calibração de FPS deste modelo.' : family ? 'Aproximação pela família do chip; diferenças de placa, memória e drivers ampliam a faixa.' : 'Classe aproximada pelos dados disponíveis; detalhes ausentes usam hipóteses gerais.'] : [],
    sourceUrls: [component.specSourceUrl, ...(component.additionalSpecSourceUrls || [])].filter(Boolean)
  };
}
export function estimatedIntegratedGraphics(cpu, ram) {
  const name = cpu?.name || '';
  const vega = /3200G|Vega\s*8/i.test(name + ' ' + (cpu?.specs?.integratedGraphics || ''));
  const score = vega ? 13 : /7600|7700|7800|9900/i.test(name) ? 7 : 10;
  const singleChannel = ram?.specs?.modulesPerKit === 1;
  return { type: 'gpu', performanceScore: score * (singleChannel ? 0.8 : 1), gamingScore: score * (singleChannel ? 0.8 : 1),
    productivityScore: score, tdp: 0, estimated: true, integrated: true, heuristicFallback: true,
    confidence: 'low', modelVersion: ESTIMATE_MODEL_VERSION, estimateBasis: 'integrated-family-scenario',
    sharedMemoryReserveGb: 2, assumptions: ['Vídeo integrado compartilha RAM; reserva de 2 GB usada como hipótese.',
      ...(singleChannel ? ['Um módulo de RAM: redução aproximada de 20% no cenário gráfico, sem promessa de ganho com outro kit.'] : []),
      'Potência gráfica integrada já faz parte do cenário de potência da CPU.'], sourceUrls: [cpu?.specSourceUrl].filter(Boolean) };
}
export function estimationDetails(parameters, { integrated = false, compatibility } = {}) {
  const entries = Object.values(parameters).filter(Boolean);
  const fallback = entries.some(p => p.heuristicFallback);
  return { modelVersion: ESTIMATE_MODEL_VERSION, kind: 'theoretical-scenario', measuredBenchmark: false,
    confidence: fallback || integrated ? 'low' : 'medium', rangeFraction: integrated ? 0.55 : fallback ? 0.45 : 0.25,
    scenarioOnly: compatibility?.compatible !== true,
    assumptions: [...new Set(entries.flatMap(p => p.assumptions || []))],
    sourceUrls: [...new Set(entries.flatMap(p => p.sourceUrls || []))],
    note: 'Estimativa aproximada das peças; não é ensaio medido nem confirmação de funcionamento da montagem.' };
}
export function estimatedRange(value, estimation, { min = 1, max = Infinity } = {}) {
  const fraction = estimation?.rangeFraction ?? 0.45;
  return { low: Math.max(min, Math.floor(value * (1 - fraction))), high: Math.min(max, Math.max(min, Math.ceil(value * (1 + fraction)))) };
}
