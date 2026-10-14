import cpuLedger from '../data/cooling-model/cpu-priors.json' with { type: 'json' };
import coolerLedger from '../data/cooling-model/cooler-priors.json' with { type: 'json' };
import acousticLedger from '../data/cooling-model/acoustic-priors.json' with { type: 'json' };
import frozenScope from '../data/cooling-model/active-model-scope.json' with { type: 'json' };
import manifest from '../data/cooling-model/model-manifest.json' with { type: 'json' };

// All coefficients remain the independently reviewed r3 design priors. They are
// neither manufacturer thermal resistances nor empirically calibrated predictions.
export const COOLING_MODEL_VERSION = manifest.modelVersion;
export const DEFAULT_COOLING_CONDITIONS = Object.freeze({
  inletCelsius: 25,
  coolerSpeedFraction: 0.75,
  extraFanSpeedFraction: 0.75,
  referenceHeatWatts: null,
  modelVersion: COOLING_MODEL_VERSION
});

const bounds = ['low', 'central', 'high'];
const scenarios = [
  { id: 'light', label: 'Leve', heatFraction: 0.25 },
  { id: 'mixed', label: 'Mista', heatFraction: 0.6 },
  { id: 'sustained', label: 'Sustentada', heatFraction: 1 }
];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isMissing = value => value === undefined || value === null || value === '';
const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
const descriptiveSpecKeys = new Set(['powerBasis', 'compatibilityNotes', 'auxiliaryPowerNotes', 'includesCpuCooler', 'includedCpuCooler']);
const byId = (rows, key = 'id') => new Map(rows.map(row => [row[key], row]));
const cpus = byId(cpuLedger.profiles);
const coolers = byId(coolerLedger.coolerProfiles);
const acousticProfiles = byId(acousticLedger.profiles, 'componentId');

// Preserve the research snapshot byte-for-byte. Its one known identity typo is
// corrected explicitly, with provenance, rather than accepting the wrong brand.
const identities = byId(frozenScope.map(identity => {
  const corrections = manifest.identityCorrections.filter(item => item.componentId === identity.id);
  return corrections.reduce((result, correction) => ({ ...result, [correction.field]: correction.canonicalValue }), identity);
}));

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
[cpuLedger, coolerLedger, acousticLedger, frozenScope, manifest, ...identities.values()].forEach(deepFreeze);

function canonical(value, seen = new Set()) {
  if (value === undefined) return { invalidValue: 'undefined' };
  if (typeof value === 'number' && !Number.isFinite(value)) return { invalidValue: String(value) };
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') return { invalidValue: typeof value };
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return { invalidValue: 'circular' };
  seen.add(value);
  const result = Array.isArray(value)
    ? value.map(item => canonical(item, seen))
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key], seen)]));
  seen.delete(value);
  return result;
}
const stable = value => JSON.stringify(canonical(value));

function relevantSpecs(specs) {
  if (!isRecord(specs)) return specs;
  return Object.fromEntries(Object.entries(specs).filter(([key]) => !descriptiveSpecKeys.has(key)).map(([key, value]) => [key,
    // Socket and memory lists are sets; order changes are not product changes.
    ['supportedSockets', 'memoryTypes'].includes(key) && Array.isArray(value) ? [...value].sort() : value
  ]));
}

/** Stable model identity; deliberately excludes price, images and source notes. */
export function coolingComponentIdentity(component) {
  if (!isRecord(component)) return stable({ invalidComponent: component });
  return stable({
    id: component.id,
    name: component.name,
    category: component.category,
    brand: component.brand,
    partNumber: component.partNumber ?? null,
    model: component.model ?? null,
    specs: relevantSpecs(component.specs)
  });
}

const expectedIdentities = new Map([...identities].map(([id, identity]) => [id, coolingComponentIdentity(identity)]));

function resolveProfile(component, category) {
  if (isMissing(component)) return { status: 'missing', code: `missing-${category}`, message: category === 'cpu' ? 'Selecione um processador.' : category === 'cooler' ? 'Selecione um cooler explicitamente.' : 'Ventoinha selecionada sem identidade.' };
  if (!isRecord(component) || ['id', 'name', 'category', 'brand'].some(key => typeof component[key] !== 'string' || !component[key].trim()) || !isRecord(component.specs)) {
    return { status: 'invalid', code: 'invalid-component', message: 'Componente incompleto ou malformado; não é possível vincular um perfil.' };
  }
  if (component.category !== category) return { status: 'invalid', code: 'wrong-component-category', message: 'A categoria do componente não corresponde à seleção.' };
  const identity = identities.get(component.id);
  if (!identity || identity.category !== category) return { status: 'unavailable', code: 'unregistered-profile', message: 'Este componente não tem um perfil aprovado; nenhum perfil genérico foi inferido.' };
  if (coolingComponentIdentity(component) !== expectedIdentities.get(component.id)) {
    return { status: 'unavailable', code: 'profile-identity-mismatch', message: 'A identidade ou as especificações mudaram; o perfil anterior precisa ser revalidado.' };
  }
  return { status: 'available', identity, profile: category === 'cpu' ? cpus.get(component.id) : category === 'cooler' ? coolers.get(component.id) : acousticProfiles.get(component.id) };
}

/** Strict normalization: malformed/out-of-domain values are never clamped. */
export function normalizeCoolingConditions(input = {}) {
  const errors = [];
  if (!isRecord(input)) return { valid: false, conditions: null, errors: [{ field: 'conditions', code: 'invalid-input', message: 'Condições de simulação inválidas.' }] };
  const conditions = { ...DEFAULT_COOLING_CONDITIONS, ...input };
  for (const field of Object.keys(input)) {
    if (!Object.hasOwn(DEFAULT_COOLING_CONDITIONS, field)) errors.push({ field, code: 'unknown-condition', message: 'Condição não reconhecida nesta versão do modelo.' });
  }
  for (const [field, min, max] of [['inletCelsius', 15, 35], ['coolerSpeedFraction', 0.5, 1], ['extraFanSpeedFraction', 0.5, 1], ['referenceHeatWatts', 5, 300]]) {
    const value = conditions[field];
    if (field === 'referenceHeatWatts' && value === null) continue;
    if (!isFiniteNumber(value)) errors.push({ field, code: 'invalid-number', message: 'Informe um número finito, sem conversão implícita de texto.' });
    else if (value < min || value > max) errors.push({ field, code: 'out-of-domain', min, max, message: `Valor fora do domínio de cenário (${min} a ${max}).` });
  }
  if (conditions.modelVersion !== COOLING_MODEL_VERSION) errors.push({ field: 'modelVersion', code: 'unsupported-model-version', message: 'As condições pertencem a outra versão do modelo; revise-as antes de recalcular.' });
  return { valid: errors.length === 0, conditions: errors.length ? null : Object.freeze(conditions), errors };
}

// Each calculation validates only its own conditions. Acoustic-only errors
// must never suppress a valid CPU/cooler thermal scenario (or vice versa).
function scopedConditions(input, ignoredFields) {
  if (input === undefined) return undefined;
  if (!isRecord(input)) return input;
  return Object.fromEntries(Object.entries(input).filter(([field]) => !ignoredFields.includes(field)));
}

function scopedConditionSignature(input, ignoredFields) {
  const scoped = scopedConditions(input, ignoredFields);
  if (scoped !== undefined && !isRecord(scoped)) return { invalid: scoped };
  // Preserve explicit null/undefined, unknown fields and malformed values.
  // These can change validity and must not collide with a valid default.
  return Object.fromEntries(Object.entries({ ...DEFAULT_COOLING_CONDITIONS, ...scoped })
    .filter(([field]) => !ignoredFields.includes(field)));
}

function interpolate(a, b, fraction) {
  return Object.fromEntries(bounds.map(bound => [bound, a[bound] + (b[bound] - a[bound]) * fraction]));
}

function bracket(values, value) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  if (value < sorted[0] || value > sorted.at(-1)) return null;
  const upper = sorted.find(node => node >= value);
  const lower = [...sorted].reverse().find(node => node <= value);
  return [lower, upper];
}

function coolerResistance(profile, heatWatts, speedFraction) {
  const heat = bracket(profile.resistanceNodes.map(node => node.heatWatts), heatWatts);
  const speed = bracket(profile.resistanceNodes.map(node => node.speedRpmFraction), speedFraction);
  if (!heat || !speed) return null;
  const atSpeed = relativeRpm => {
    const at = watts => profile.resistanceNodes.find(node => node.heatWatts === watts && node.speedRpmFraction === relativeRpm);
    const first = at(heat[0]);
    const last = at(heat[1]);
    if (!first || !last) return null;
    return interpolate(first, last, heat[0] === heat[1] ? 0 : (heatWatts - heat[0]) / (heat[1] - heat[0]));
  };
  const first = atSpeed(speed[0]);
  const last = atSpeed(speed[1]);
  if (!first || !last) return null;
  // resistanceNodes already include high-load increments. Never add them twice.
  return interpolate(first, last, speed[0] === speed[1] ? 0 : (speedFraction - speed[0]) / (speed[1] - speed[0]));
}

function limitFlags(temperatureCelsius, limit) {
  if (limit === null || !temperatureCelsius) return { thermalLimitStatus: 'unknown', centralReachesLimit: null, rangeReachesLimit: null };
  const centralReachesLimit = temperatureCelsius.central >= limit;
  const rangeReachesLimit = temperatureCelsius.high >= limit;
  return { thermalLimitStatus: centralReachesLimit ? 'central-reaches-limit' : rangeReachesLimit ? 'range-crosses-limit' : 'below-limit-in-scenarios', centralReachesLimit, rangeReachesLimit };
}

function domainWarnings(profile, heatWatts) {
  return profile.domainWarnings.filter(warning => {
    const condition = /^heatWatts([<>])(\d+(?:\.\d+)?)$/.exec(warning.condition);
    return condition && (condition[1] === '<' ? heatWatts < Number(condition[2]) : heatWatts > Number(condition[2]));
  }).map(warning => ({ code: warning.code, message: warning.messagePt }));
}

function unavailableThermal(status, warnings, reference = {}) {
  return {
    status, available: false, basis: 'assumed-design-priors', scenarioBands: [], warnings, message: warnings[0]?.message ?? 'Simulação indisponível.',
    missingInputs: warnings.filter(warning => warning.code?.startsWith('missing-')).map(warning => warning.code.slice(8)),
    thermalLimitCelsius: null, tjMaxCelsius: null, thermalLimitStatus: 'unknown', centralReachesLimit: null, rangeReachesLimit: null,
    outOfDomain: status === 'out-of-domain', domainStatus: status === 'out-of-domain' ? 'outside-computational-domain' : 'unavailable',
    referenceHeatWatts: null, referenceHeatBasis: null, referenceHeatSourceUrl: null,
    ...reference
  };
}

function thermalSimulation(cpuResolution, coolerResolution, conditions, conditionErrors) {
  if (!conditions) return unavailableThermal(conditionErrors.some(error => error.code === 'out-of-domain') ? 'out-of-domain' : 'invalid', conditionErrors);
  const cpu = cpuResolution.profile;
  const reference = cpu ? {
    referenceHeatWatts: conditions.referenceHeatWatts ?? cpu.simulationAssumptions.defaultScenarioHeatWatts,
    referenceHeatBasis: conditions.referenceHeatWatts === null ? 'Potência de cenário baseada no TDP/potência base nominal; não é consumo medido nem máximo.' : 'Potência térmica de cenário definida por você; não é consumo medido.',
    referenceHeatKind: conditions.referenceHeatWatts === null ? 'nominal-power-scenario' : 'user-defined-scenario',
    referenceHeatSourceUrl: conditions.referenceHeatWatts === null ? cpu.manufacturerFacts.sourceUrl : null
  } : {};
  const missingProfiles = [cpuResolution, coolerResolution].filter(resolution => resolution.status !== 'available');
  if (missingProfiles.length) {
    const status = missingProfiles.some(item => item.status === 'invalid') ? 'invalid' : missingProfiles.some(item => item.status === 'missing') ? 'missing' : 'unavailable';
    return unavailableThermal(status, missingProfiles.map(({ code, message }) => ({ code, message })), reference);
  }
  const cooler = coolerResolution.profile;
  if (!cooler.supportedSockets.includes(cpu.identity.socket)) return unavailableThermal('incompatible', [{ code: 'incompatible-cpu-socket', message: 'O cooler selecionado não suporta o soquete deste processador.' }], reference);
  const limit = cpu.manufacturerFacts.tjMaxCelsius;
  const bands = scenarios.map(scenario => {
    // Q is fixed for every bound in this scenario; only resistance assumptions vary.
    const heatWatts = reference.referenceHeatWatts * scenario.heatFraction;
    const resistance = coolerResistance(cooler, heatWatts, conditions.coolerSpeedFraction);
    const temperatureCelsius = resistance ? Object.fromEntries(bounds.map(bound => [bound,
      conditions.inletCelsius + heatWatts * (cpuLedger.sharedPackagePrior[bound] + resistance[bound])
    ])) : null;
    const warnings = domainWarnings(cooler, heatWatts);
    const flags = limitFlags(temperatureCelsius, limit);
    if (flags.rangeReachesLimit) warnings.push({ code: flags.thermalLimitStatus, message: 'Pode atingir o limite térmico; potência sustentada não garantida. Valores algébricos não são temperaturas de operação previstas.' });
    if (!resistance) warnings.push({ code: 'out-of-domain', message: 'Carga ou rotação fora dos nós do modelo; extrapolação desativada.' });
    return {
      ...scenario, heatWatts, temperatureCelsius, coolerEquivalentResistance: resistance,
      available: Boolean(resistance), outOfDomain: !resistance,
      outsideBaselineAssumptionDomain: heatWatts < cooler.supportedDomain.baselineAssumptionHeatWatts[0] || heatWatts > cooler.supportedDomain.baselineAssumptionHeatWatts[1],
      ...flags, warnings
    };
  });
  const highest = bands.at(-1);
  const outOfDomain = bands.some(scenario => scenario.outOfDomain);
  const warnings = bands.flatMap(scenario => scenario.warnings.map(warning => ({ ...warning, scenarioId: scenario.id })));
  if (limit === null) warnings.push({ code: 'unknown-thermal-limit', message: 'Limite térmico não verificado; a classificação de limite está indisponível.' });
  return {
    status: outOfDomain ? 'out-of-domain' : 'available', available: !outOfDomain, basis: 'assumed-design-priors',
    ...reference, scenarioBands: bands, warnings, missingInputs: [],
    thermalLimitCelsius: limit, tjMaxCelsius: limit, message: null, ...limitFlags(highest.temperatureCelsius, limit), outOfDomain,
    domainStatus: outOfDomain ? 'outside-computational-domain' : bands.some(scenario => scenario.outsideBaselineAssumptionDomain) ? 'assumption-extension' : 'baseline-assumption-domain',
    supportedDomain: cooler.supportedDomain,
    cpuProfileId: cpu.id, coolerProfileId: cooler.id,
    coolerFanRpm: cooler.speedDefinition.nominalMaxRpm * conditions.coolerSpeedFraction,
    pumpCondition: cooler.pumpCondition,
    compatibilityScope: 'cpu-socket-only; case, RAM and motherboard clearance need separate verification',
    displayRoundingDegrees: 5
  };
}

const toEnergy = dba => 10 ** (dba / 10);
const toDba = energy => energy > 0 ? 10 * Math.log10(energy) : null;

function acousticEnergy(profile, speedFraction) {
  // Some public sparse anchors are between presets; ignoring them changes the model.
  const nodes = [...profile.rpmNodes, ...(profile.additionalRpmNodes ?? [])].sort((a, b) => a.fanRpm - b.fanRpm);
  const rpm = profile.ratedFanRpm * speedFraction;
  const limits = bracket(nodes.map(node => node.fanRpm), rpm);
  if (!limits || profile.conventionId !== acousticLedger.convention.id) return null;
  const lower = nodes.find(node => node.fanRpm === limits[0]);
  const upper = nodes.find(node => node.fanRpm === limits[1]);
  const fraction = limits[0] === limits[1] ? 0 : (rpm - limits[0]) / (limits[1] - limits[0]);
  return Object.fromEntries(bounds.map(bound => [bound, toEnergy(lower[bound]) + (toEnergy(upper[bound]) - toEnergy(lower[bound])) * fraction]));
}

function sourceProvenance(profile) {
  return {
    componentId: profile.componentId, profileRevision: profile.profileRevision,
    label: profile.genericFallback ? 'Perfil acústico genérico assumido' : 'Perfil acústico aproximado com hipóteses de transferência',
    basis: profile.basis, assumed: true, genericFallback: profile.genericFallback,
    containsGenericAssumptions: profile.genericFallback || Boolean(profile.diagnosticInternalSources?.some(source => source.basis?.startsWith('generic-assumed'))),
    transferAssumptions: profile.transferAssumptions,
    sourceUrls: profile.sourceIds.map(id => acousticLedger.sources[id].url),
    sources: profile.sourceIds.map(id => ({ id, ...acousticLedger.sources[id] }))
  };
}

function defaultOmissions() {
  return [
    ['gpu', 'GPU'], ['psu', 'Fonte'], ['drives', 'Armazenamento'],
    ['ambient-background', 'Ruído ambiente'], ['coil-whine', 'Ruído elétrico (coil whine)']
  ].map(([id, label]) => ({ id, label, reason: 'outside-model-scope', selected: false, affectsCoverage: false }));
}

function acousticSimulation(cooler, coolerResolution, fans, caseComponent, coolerConditions, fanConditions) {
  const includedSources = [];
  const excludedSources = defaultOmissions();
  const warnings = [];
  const totalEnergy = { low: 0, central: 0, high: 0 };
  const exclude = (id, label, reason, message, affectsCoverage = true) => {
    excludedSources.push({
      id: typeof id === 'string' ? id : 'invalid-source',
      label: typeof label === 'string' ? label : 'Componente inválido',
      reason, message, selected: affectsCoverage && id !== 'case-included-fans', affectsCoverage
    });
    if (affectsCoverage) warnings.push({ code: reason, message });
  };
  const include = (component, profile, physicalUnits, speedFraction, stopped = false) => {
    const energy = stopped || physicalUnits === 0 ? { low: 0, central: 0, high: 0 } : acousticEnergy(profile, speedFraction);
    if (!energy) return exclude(component.id, component.name, 'unavailable-acoustic-domain', 'Perfil acústico fora do domínio ou de convenção incompatível.');
    const contribution = Object.fromEntries(bounds.map(bound => [bound, energy[bound] * physicalUnits]));
    bounds.forEach(bound => { totalEnergy[bound] += contribution[bound]; });
    includedSources.push({
      componentId: component.id, name: component.name, sourceScope: profile.sourceScope,
      quantityBasis: profile.quantityBasis, physicalUnits, unitsPerPack: profile.unitsPerPack,
      state: stopped ? 'stopped' : physicalUnits === 0 ? 'zero-units' : 'modelled',
      fanRpm: stopped ? 0 : profile.ratedFanRpm * speedFraction,
      bandDba: contribution.central > 0 ? Object.fromEntries(bounds.map(bound => [bound, toDba(contribution[bound])])) : null,
      includes: profile.includes,
      // Assembly nodes already include the fixed pump/VRM. Diagnostic sources are
      // not independently summed, and changing radiator RPM never stops the pump.
      fixedControls: profile.fixedControls ?? null,
      provenance: sourceProvenance(profile)
    });
  };

  if (isMissing(cooler)) exclude('cpu-cooler', 'Cooler não selecionado', 'not-selected', 'Nenhum cooler foi inferido a partir da caixa do processador.', false);
  else if (!coolerConditions) exclude(cooler?.id ?? 'cpu-cooler', 'Cooler selecionado', 'invalid-conditions', 'Condições inválidas; ruído do cooler não calculado.');
  else if (coolerResolution.status !== 'available') exclude(cooler?.id ?? 'cpu-cooler', cooler?.name ?? 'Cooler selecionado', coolerResolution.code, coolerResolution.message);
  else include(cooler, acousticProfiles.get(cooler.id), 1, coolerConditions.coolerSpeedFraction);

  const selectedFanIds = Array.isArray(fans) ? fans.map(fan => fan?.id).filter(id => typeof id === 'string') : [];
  const duplicateFanIds = new Set(selectedFanIds.filter((id, index) => selectedFanIds.indexOf(id) !== index));
  const reportedDuplicateIds = new Set();
  if (!Array.isArray(fans)) exclude('extra-fans', 'Ventoinhas selecionadas', 'invalid-fan-list', 'A lista de ventoinhas está malformada; fontes não calculadas.');
  else fans.forEach((fan, index) => {
    if (duplicateFanIds.has(fan?.id)) {
      // Repeated imported rows have ambiguous installed counts. Exclude every
      // row for that product, once in the report; quantity is the multiplier.
      if (!reportedDuplicateIds.has(fan.id)) {
        exclude(fan.id, fan.name, 'duplicate-fan-selection', 'Ventoinha repetida na seleção; unifique os kits no campo quantidade antes de calcular.');
        reportedDuplicateIds.add(fan.id);
      }
      return;
    }
    const resolution = resolveProfile(fan, 'fan');
    if (resolution.status !== 'available') return exclude(fan?.id ?? `fan-${index}`, fan?.name ?? `Ventoinha ${index + 1}`, resolution.code, resolution.message);
    const quantity = fan.quantity === undefined ? 1 : fan.quantity;
    const unitsPerPack = resolution.profile.unitsPerPack;
    const purchasedUnits = Number.isSafeInteger(quantity) ? quantity * unitsPerPack : null;
    const physicalUnits = fan.installedCount === undefined ? purchasedUnits : fan.installedCount;
    if (!Number.isSafeInteger(quantity) || quantity < 0 || !Number.isSafeInteger(purchasedUnits) || !Number.isSafeInteger(physicalUnits) || physicalUnits < 0 || physicalUnits > purchasedUnits || (fan.stopped !== undefined && typeof fan.stopped !== 'boolean')) {
      return exclude(fan.id, fan.name, 'invalid-fan-quantity', 'Quantidade de kits/unidades instaladas ou estado da ventoinha inválido.');
    }
    if (!fanConditions) return exclude(fan.id, fan.name, 'invalid-conditions', 'Condições inválidas; ruído das ventoinhas não calculado.');
    include(fan, resolution.profile, physicalUnits, fanConditions.extraFanSpeedFraction, fan.stopped === true);
  });

  if (isMissing(caseComponent)) exclude('case-included-fans', 'Ventoinhas inclusas no gabinete', 'case-not-selected', 'Nenhum gabinete selecionado; ventoinhas inclusas não foram inferidas.', false);
  else if (!isRecord(caseComponent) || caseComponent.category !== 'case' || !isRecord(caseComponent.specs)) exclude('case-included-fans', 'Ventoinhas inclusas no gabinete', 'invalid-case', 'Gabinete malformado; não é possível verificar suas ventoinhas inclusas.');
  else {
    const count = caseComponent.specs.includedFanCount;
    if (!Number.isSafeInteger(count) || count < 0) exclude('case-included-fans', 'Ventoinhas inclusas no gabinete', 'unknown-case-fans', 'Quantidade/modelos das ventoinhas inclusas no gabinete não verificados.');
    else if (count > 0) {
      const name = typeof caseComponent.name === 'string' ? caseComponent.name : 'gabinete';
      exclude('case-included-fans', `${count} ventoinha(s) inclusa(s) no ${name}`, 'unmodelled-case-fans', 'Ventoinhas inclusas no gabinete não têm perfil acústico explícito; subtotal parcial.');
      Object.assign(excludedSources.at(-1), { caseComponentId: typeof caseComponent.id === 'string' ? caseComponent.id : null, caseName: name, physicalUnits: count });
    }
  }
  const coverage = excludedSources.some(source => source.affectsCoverage) ? 'partial' : 'complete';
  const available = totalEnergy.central > 0;
  return {
    status: !coolerConditions && !fanConditions ? 'invalid' : available ? (coverage === 'partial' ? 'partial' : 'available') : coverage === 'partial' ? 'unavailable' : 'no-sources',
    available, coverage, coverageScope: 'selected-cooling-only',
    bandDba: available ? Object.fromEntries(bounds.map(bound => [bound, toDba(totalEnergy[bound])])) : null,
    includedSources, excludedSources, warnings,
    convention: acousticLedger.convention, distanceM: 1, label: 'Cooler e ventoinhas selecionadas a 1 m',
    disclosure: 'Ruído aproximado das fontes modeladas; não é o ruído do PC completo. GPU, fonte, armazenamento, ruído elétrico e ambiente ficam fora do cálculo.',
    modelVersion: COOLING_MODEL_VERSION
  };
}

function provenance(cpuResolution, coolerResolution, acoustics) {
  const cpu = cpuResolution.profile;
  const cooler = coolerResolution.profile;
  const thermal = {
    label: 'Modelo térmico aproximado com prior genérico compartilhado de encapsulamento/contato',
    basis: 'assumed-design-priors', assumed: true, genericPackagePrior: true,
    packagePrior: cpuLedger.sharedPackagePrior,
    cpu: cpu ? { id: cpu.id, manufacturerFacts: cpu.manufacturerFacts, limitations: cpu.limitations } : null,
    cooler: cooler ? { id: cooler.id, profileRevision: cooler.profileRevision, modelBasis: cooler.modelBasis, coefficientBasis: cooler.coefficientBasis, transferAssumptions: cooler.transferAssumptions, sources: cooler.sources } : null,
    sourceUrls: [...new Set([...(cpu ? [cpu.manufacturerFacts.sourceUrl] : []), ...(cooler?.sources.map(source => source.url) ?? [])])]
  };
  const sourceUrls = [...new Set([...thermal.sourceUrls, ...acoustics.includedSources.flatMap(source => source.provenance.sourceUrls), ...manifest.methodology.map(source => source.url)])];
  return {
    label: 'Hipóteses de cenário; sem calibração empírica de precisão',
    modelVersion: COOLING_MODEL_VERSION, profileRevision: manifest.profileRevision, reviewedAt: manifest.reviewedAt,
    assumed: true, empiricallyCalibrated: false, thermal,
    acoustic: acoustics.includedSources.map(source => source.provenance),
    methodology: manifest.methodology, sourceUrls,
    limitations: [
      'Faixas de cenários, não intervalos de confiança nem especificações do fabricante.',
      '25%, 60% e 100% são frações da potência térmica de referência; não são utilização da CPU.',
      'A potência é fixa em cada cenário; a faixa varia somente as hipóteses de resistência.',
      'Temperaturas algébricas não modelam limitação de potência, throttling ou transientes.',
      'Gabinete, GPU e ventoinhas extras não alteram o cálculo térmico; o ar de entrada é uma condição explícita.',
      'Rotações são frações do RPM nominal, não duty cycle PWM; AIOs mantêm bomba e VRM fixos.'
    ]
  };
}

/** Signatures for cached scenario snapshots; a price refresh does not invalidate physics. */
export function coolingSimulationSignatures({ cpu, cooler, fans = [], caseComponent, conditions } = {}) {
  const thermal = stable({
    modelVersion: COOLING_MODEL_VERSION, cpu: coolingComponentIdentity(cpu), cooler: coolingComponentIdentity(cooler),
    conditions: scopedConditionSignature(conditions, ['extraFanSpeedFraction'])
  });
  const acoustics = stable({
    modelVersion: COOLING_MODEL_VERSION, cooler: coolingComponentIdentity(cooler),
    fans: Array.isArray(fans) ? fans.map(fan => ({ identity: coolingComponentIdentity(fan), quantity: fan?.quantity === undefined ? 1 : fan.quantity, installedCount: fan?.installedCount, stopped: fan?.stopped === undefined ? false : fan.stopped })) : { invalid: fans },
    caseFans: isMissing(caseComponent) ? null : { id: caseComponent?.id, name: caseComponent?.name, category: caseComponent?.category, validRecord: isRecord(caseComponent) && isRecord(caseComponent.specs), includedFanCount: caseComponent?.specs?.includedFanCount },
    conditions: scopedConditionSignature(conditions, ['inletCelsius', 'referenceHeatWatts'])
  });
  return { thermal, acoustics, simulation: stable({ thermal, acoustics }) };
}

/** Pure scenario engine. Unknown imports stay unavailable/partial; no hidden fallback. */
export function simulateCooling(input = {}) {
  if (!isRecord(input)) input = { conditions: null };
  const { cpu, cooler, fans = [], caseComponent, conditions } = input;
  const normalized = normalizeCoolingConditions(conditions);
  const thermalConditions = normalizeCoolingConditions(scopedConditions(conditions, ['extraFanSpeedFraction']));
  const coolerNoiseConditions = normalizeCoolingConditions(scopedConditions(conditions, ['inletCelsius', 'referenceHeatWatts', 'extraFanSpeedFraction']));
  const extraFanNoiseConditions = normalizeCoolingConditions(scopedConditions(conditions, ['inletCelsius', 'referenceHeatWatts', 'coolerSpeedFraction']));
  const cpuResolution = resolveProfile(cpu, 'cpu');
  const coolerResolution = resolveProfile(cooler, 'cooler');
  const thermal = thermalSimulation(cpuResolution, coolerResolution, thermalConditions.conditions, thermalConditions.errors);
  const acoustics = acousticSimulation(cooler, coolerResolution, fans, caseComponent, coolerNoiseConditions.conditions, extraFanNoiseConditions.conditions);
  const warnings = [...thermal.warnings, ...acoustics.warnings];
  return deepFreeze({
    modelVersion: COOLING_MODEL_VERSION, conditions: normalized.conditions,
    validConditions: normalized.valid, conditionErrors: normalized.errors, conditionsErrors: normalized.errors,
    status: thermal.available ? acoustics.coverage === 'partial' ? 'partial' : 'available' : thermal.status,
    available: thermal.available || acoustics.available,
    thermal, acoustics, warnings,
    provenance: provenance(cpuResolution, coolerResolution, acoustics),
    signatures: coolingSimulationSignatures({ cpu, cooler, fans, caseComponent, conditions })
  });
}
