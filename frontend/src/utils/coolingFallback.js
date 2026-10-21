// Broad engineering scenarios. These are assumed class constants, never tests
// of the selected SKU and never manufacturer thermal/acoustic specifications.
export const COOLING_CLASS_MODEL_VERSION = 'cooling-class-v1';
const sourceUrls = ['https://www.ti.com/lit/pdf/slva462', 'https://support.arctic.de/pwm-settings'];
const band = (center, spread) => ({ low: Math.max(0, center - spread), central: center, high: center + spread });
export function approximateThermal(cpu, cooler, conditions) {
  const watts = conditions.referenceHeatWatts ?? cpu.specs?.tdpWatts ?? 65;
  const radiator = cooler?.specs?.radiatorSizeMm;
  const compact = Number.isFinite(cooler?.specs?.heightMm) && cooler.specs.heightMm < 80;
  const resistance = cooler?.specs?.coolingType === 'aio' ? radiator >= 360 ? 0.12 : 0.18 : !cooler || compact ? 0.55 : 0.30;
  const speed = conditions.coolerSpeedFraction || 0.75;
  const limit = cpu.specs?.maxOperatingTempC ?? cpu.specs?.tjMaxCelsius ?? null;
  const scenarioBands = [['light', 0.25], ['mixed', 0.6], ['sustained', 1]].map(([id, fraction]) => {
    const heatWatts = watts * fraction;
    const rise = heatWatts * (0.10 + resistance * (0.75 / speed) ** 0.55);
    const temperatureCelsius = { low: conditions.inletCelsius + rise * 0.6, central: conditions.inletCelsius + rise, high: conditions.inletCelsius + rise * 1.45 };
    return { id, heatWatts, available: true, temperatureCelsius,
      centralReachesLimit: Number.isFinite(limit) && temperatureCelsius.central >= limit,
      rangeReachesLimit: Number.isFinite(limit) && temperatureCelsius.high >= limit, warnings: [] };
  });
  return { available: true, status: 'available', basis: 'generic-engineering-scenario', modelVersion:COOLING_CLASS_MODEL_VERSION, heuristicFallback: true,
    confidence: 'low', scenarioBands, thermalLimitCelsius: limit, tjMaxCelsius: limit,
    thermalLimitStatus: Number.isFinite(limit) ? 'estimated' : 'unknown', referenceHeatWatts: watts,
    referenceHeatBasis: 'Potência nominal ou hipótese de 65 W quando ausente; não é consumo medido.',
    assumptions: [cooler ? 'Resistência aproximada da classe do cooler; encaixe não altera o cenário teórico.'
      : `Cooler padrão aproximado${cpu.specs?.includedCpuCooler?.name ? ` (${cpu.specs.includedCpuCooler.name})` : ''}; não adiciona um produto nem preço à montagem.`,
      'Faixas de resistência de -40% a +45%; montagem, carga e ambiente podem mudar o resultado.'],
    sourceUrls, warnings: [], missingInputs: [], displayRoundingDegrees: 5 };
}
export function approximateAcoustics({ cpu, cooler, fans = [], caseComponent, conditions }, previous) {
  const sources = [...(previous.includedSources || [])];
  const excludedSources = (previous.excludedSources || []).filter(source => /invalid|duplicate|wrong-component-category/.test(source.reason || ''));
  const excluded = id => excludedSources.some(source => source.id === id);
  const has = id => sources.some(source => source.componentId === id);
  const add = (id, name, count, center) => {
    if (!Number.isFinite(count) || count <= 0 || has(id)) return;
    const value = center + 10 * Math.log10(count);
    sources.push({ componentId: id, name, physicalUnits: count, bandDba: band(value, 8),
      provenance: { assumed: true, genericFallback: true, sourceUrls, label: 'Classe acústica aproximada, não medição' } });
  };
  if (cpu && (!cooler || cooler.category === 'cooler') && !excluded(cooler?.id) && !has(cooler?.id)) add(cooler?.id || 'scenario-standard-cooling', cooler?.name || cpu.specs?.includedCpuCooler?.name || 'Cooler padrão do cenário', 1,
    (cooler?.specs?.coolingType === 'aio' ? 29 : cooler ? 25 : 28) + 30 * Math.log10((conditions.coolerSpeedFraction || 0.75) / 0.75));
  if (Array.isArray(fans)) fans.forEach(fan => {
    if (!fan || typeof fan.id !== 'string' || typeof fan.name !== 'string' || !fan.specs || typeof fan.specs !== 'object' || Array.isArray(fan.specs) || fan.category !== 'fan' || excluded(fan.id) || fan.stopped === true || fans.filter(item => item?.id === fan.id).length > 1) return;
    const quantity = fan.quantity ?? 1, pack = fan.specs?.unitsPerPack ?? 1;
    const count = fan.installedCount ?? quantity * pack;
    if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(pack) || pack < 1 || !Number.isSafeInteger(count) || count < 0 || count > quantity * pack || (fan.stopped !== undefined && typeof fan.stopped !== 'boolean')) return;
    add(fan.id, fan.name || 'Ventoinha aproximada', count, 24 + 30 * Math.log10((conditions.extraFanSpeedFraction || 0.75) / 0.75));
  });
  if (caseComponent?.category === 'case' && !excluded('case-included-fans')) add('case-included-fans', 'Ventoinhas do gabinete (cenário)', caseComponent.specs?.includedFanCount ?? 2, 23);
  if (sources.length === (previous.includedSources || []).length) return previous;
  const summed = Object.fromEntries(['low', 'central', 'high'].map(key => [key, sources.reduce((sum, source) => sum + (source.bandDba ? 10 ** (source.bandDba[key] / 10) : 0), 0)]));
  return { ...previous, available: summed.central > 0, status: summed.central > 0 ? 'available' : 'no-sources',
    coverage: excludedSources.length ? 'partial' : 'estimated', modelVersion:COOLING_CLASS_MODEL_VERSION, heuristicFallback: true, confidence: 'low', includedSources: sources,
    excludedSources, warnings: previous.warnings || [], bandDba: summed.central > 0 ? Object.fromEntries(Object.entries(summed).map(([key, value]) => [key, 10 * Math.log10(value)])) : null,
    assumptions: ['Soma logarítmica das fontes de refrigeração a 1 m; classes desconhecidas usam faixa de ±8 dBA.',
      'Quantidade desconhecida de ventoinhas do gabinete: hipótese de duas. Não inclui GPU, fonte ou ruído ambiente.'], sourceUrls };
}
