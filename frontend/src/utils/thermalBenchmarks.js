// Published measurements only. This module does not model a build's temperature.
const publishedBenchmark = Object.freeze({
  id: 'tech4gamers-pure-rock-3-black-i7-13700k-190w',
  cpu: Object.freeze({ id: 'cpu-intel-i7-13700k', name: 'Intel Core i7-13700K' }),
  cooler: Object.freeze({ id: 'cooler-bequiet-pure-rock-3-black', name: 'be quiet! Pure Rock 3 Black', partNumber: 'BK039' }),
  measurements: Object.freeze([
    Object.freeze({ id: 'idle', label: 'Repouso', temperatureCelsius: 36 }),
    Object.freeze({ id: 'load', label: 'Carga', temperatureCelsius: 95 })
  ]),
  conditions: Object.freeze({
    ambientCelsius: 23,
    fanPwmPercent: 100,
    chartPowerLabelWatts: 190,
    workload: 'Cinebench R23.2',
    loadDurationMinutes: 30,
    idleDurationMinutes: 10,
    motherboard: 'MSI MEG Z790 ACE MAX',
    case: 'Thermaltake Core P6 em configuração aberta',
    thermalPaste: 'Noctua NT-H1'
  }),
  // The source reports idle/load values, without specifying mean, peak or core aggregation.
  metric: 'reported-idle-load',
  aggregation: null,
  source: Object.freeze({
    publisher: 'Tech4Gamers',
    title: 'be quiet! Pure Rock 3 Black Air Cooler Review',
    url: 'https://tech4gamers.com/be-quiet-pure-rock-3-black-air-cooler-review/',
    chartUrl: 'https://tech4gamers.com/wp-content/uploads/2025/02/be-quiet-Pure-Rock-3-Thermal-Performance-Intel.jpg'
  })
});

const normalizeIdentity = value => typeof value === 'string' ? value.trim().toLowerCase().replace(/\s+/g, ' ') : null;

function optionalIdentityMatches(value, accepted) {
  if (value === undefined || value === null || value === '') return true;
  return accepted.includes(normalizeIdentity(value));
}

function matchesIdentity(component, expected, category, brand, models, partNumbers) {
  if (!component || typeof component !== 'object' || Array.isArray(component) || component.id !== expected.id) return false;
  if (!optionalIdentityMatches(component.category, [category]) || !optionalIdentityMatches(component.brand, [brand])) return false;
  if (!optionalIdentityMatches(component.name, [normalizeIdentity(expected.name)])) return false;
  return [component, component.specs].filter(Boolean).every(identity =>
    optionalIdentityMatches(identity.model, models)
    && optionalIdentityMatches(identity.partNumber, partNumbers)
  );
}

/**
 * Returns a published result only for the exact verified CPU/cooler pair.
 * Optional identifiers must agree. Unknown part numbers are rejected rather than
 * guessed, including CPU order codes that this dataset has not verified.
 * Additional case fans, estimated power and build settings are not inputs.
 */
export function getThermalBenchmark(cpu, cooler) {
  if (!matchesIdentity(cpu, publishedBenchmark.cpu, 'cpu', 'intel', [
    'intel core i7-13700k', 'core i7-13700k', 'i7-13700k'
  ], [])) return null;
  if (!matchesIdentity(cooler, publishedBenchmark.cooler, 'cooler', 'be quiet!', [
    'be quiet! pure rock 3 black', 'pure rock 3 black', 'bk039'
  ], ['bk039'])) return null;
  return publishedBenchmark;
}
