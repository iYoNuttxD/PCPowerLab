import { verifiedFeatureFields, formatVerifiedFeature } from './verifiedFeaturesPresentation.js';
import { translateSpecLabel } from './translations.js';

export const componentSpecFields = {
  cpu: ['socket', 'cores', 'threads', 'baseClockGhz', 'boostClockGhz', 'tdpWatts'],
  gpu: ['vramGb', 'tdpWatts', 'lengthMm', 'recommendedPsuWatts'],
  motherboard: ['socket', 'memoryType', 'formFactor', 'chipset', 'storageInterfaces'],
  ram: ['memoryType', 'capacityGb', 'speedMhz'],
  storage: ['storageType', 'interface', 'capacityGb', 'readSpeedMbS', 'writeSpeedMbS'],
  psu: ['watts', 'efficiency'],
  case: ['supportedFormFactors', 'maxGpuLengthMm', 'maxCoolerHeightMm', 'radiatorSizesMm', 'fanMounts'],
  cooler: ['coolingType', 'supportedSockets', 'heightMm', 'radiatorSizeMm', 'powerWatts'],
  fan: ['diameterMm', 'thicknessMm', 'connector', 'powerWatts', 'unitsPerPack']
};

const units = {
  maxMemoryGb: 'GB', capacityPerModuleGb: 'GB', voltageV: 'V', enduranceTBW: 'TB', m2LengthMm: 'mm',
  radiatorThicknessMm: 'mm', fanDiameterMm: 'mm', fanThicknessMm: 'mm', totalEnvelopeThicknessMm: 'mm', maxRadiatorThicknessMm: 'mm',
  frontRadiatorMaxThicknessMm: 'mm', maxGpuLengthWithHddBracketMm: 'mm', maxGpuLengthWithoutFrontRadiatorMm: 'mm', includedFanDiameterMm: 'mm',
  dataRateMTs: 'MT/s', maxFanThicknessMm: 'mm',
  baseClockGhz: 'GHz', boostClockGhz: 'GHz', tdpWatts: 'W', recommendedPsuWatts: 'W',
  heightMm: 'mm', radiatorSizeMm: 'mm', diameterMm: 'mm', thicknessMm: 'mm', maxCoolerHeightMm: 'mm', powerWatts: 'W', lengthMm: 'mm', maxGpuLengthMm: 'mm', speedMhz: 'MT/s', capacityGb: 'GB', vramGb: 'GB',
  readSpeedMbS: 'MB/s', writeSpeedMbS: 'MB/s', watts: 'W'
};

export function specLabel(key) {
  if (key === 'socket') return 'Encaixe (socket)';
  if (key === 'recommendedPsuWatts') return 'Fonte recomendada';
  if (key === 'speedMhz') return 'Taxa de transferência';
  if (key === 'readSpeedMbS') return 'Leitura (até)';
  if (key === 'writeSpeedMbS') return 'Gravação (até)';
  const labels = { typicalBoardPowerWatts: 'Alimentação típica declarada (W)', powerConnectors: 'Conectores de alimentação', fanHeaders: 'Conectores de ventoinhas', cpu: 'CPU', cpuPump: 'Bomba / CPU', system: 'Gabinete', systemPump: 'Gabinete / bomba', pcie8pin: 'PCIe de 8 pinos', pcie6pin: 'PCIe de 6 pinos', eps8pin: 'CPU de 8 pinos', atx24pin: 'ATX de 24 pinos' };
  return labels[key] || verifiedFeatureFields[key] || translateSpecLabel(key);
}

export function formatSpecValue(key, value) {
  if (key in verifiedFeatureFields) return formatVerifiedFeature(key, value === 'true' ? true : value === 'false' ? false : value);
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return 'Não informado';
  if (key === 'fanMounts' && Array.isArray(value)) return value.map(mount => `${mount.diameterMm ?? '?'} mm: até ${mount.capacity ?? '?'} ventoinha(s)`).join('; ');
  if (key === 'radiatorSizesMm' && Array.isArray(value)) return value.map(size => `${size} mm`).join(', ');
  if (key === 'm2SupportedLengthsMm' && Array.isArray(value)) return value.map(size => `${size} mm`).join(', ');
  if (['dimensionsMm', 'radiatorDimensionsMm'].includes(key) && typeof value === 'object' && !Array.isArray(value)) {
    const names = { length: 'Comprimento', width: 'Largura', height: 'Altura', thickness: 'Espessura' };
    return Object.entries(value).map(([dimension, size]) => `${names[dimension] || dimension}: ${size == null ? 'não informado' : `${Number(size).toLocaleString('pt-BR')} mm`}`).join(' · ');
  }
  if (key === 'speedProfile' && value === 'JEDEC DDR4-3200; no XMP needed for rated JEDEC profile') return 'JEDEC DDR4-3200; dispensa XMP para a taxa declarada';
  if (key === 'formFactor') {
    if (value === 'M.2 2280 single-sided') return 'M.2 2280, componentes em uma face';
    if (value === '2.5-inch 7mm') return '2,5 polegadas, 7 mm';
  }
  if (key === 'color') return { White: 'Branco', Black: 'Preto', white: 'Branco', black: 'Preto' }[value] || String(value);
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join(', ');
  if (typeof value === 'object') return Object.entries(value).filter(([, entry]) => entry != null).map(([name, entry]) => `${specLabel(name)}: ${Array.isArray(entry) ? entry.join(', ') : String(entry)}`).join(' · ') || 'Não informado';
  if (key === 'coolingType') return value === 'air' ? 'A ar' : value === 'aio' ? 'Líquida (AIO)' : String(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return units[key] && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('pt-BR')} ${units[key]}` : String(value);
}

export function specKeys(components) {
  const keys = [...new Set([
    ...(componentSpecFields[components[0]?.category] || []),
    ...components.flatMap(component => Object.keys(component.specs || {}))
  ])].filter(key => !['cpuFamilies', 'minimumBiosByCpu', 'gpuPcieGeneration'].includes(key));
  // The legacy speedMhz key stores MT/s; avoid printing its exact alias twice.
  const sameRate = keys.includes('speedMhz') && components.every(component => component.specs?.dataRateMTs == null || component.specs?.dataRateMTs === component.specs?.speedMhz);
  return sameRate ? keys.filter(key => key !== 'dataRateMTs') : keys;
}

export const catalogFilterFields = {
  cpu: ['socket', 'cores'], gpu: ['vramGb'],
  motherboard: ['socket', 'memoryType', 'formFactor', 'chipset', 'wifi', 'm2Slots'],
  ram: ['memoryType', 'capacityGb', 'speedMhz'],
  storage: ['interface', 'capacityGb', 'readSpeedMbS', 'writeSpeedMbS'],
  psu: ['watts', 'efficiency'], case: ['supportedFormFactors'],
  cooler: ['coolingType', 'supportedSockets', 'heightMm', 'radiatorSizeMm'],
  fan: ['diameterMm', 'thicknessMm', 'connector']
};

export const emptyCatalogFilters = {
  search: '', brand: 'all', category: 'all', minPrice: '', maxPrice: '',
  specs: {}, sort: 'name-asc', minPerformance: '', maxPerformance: '', compatibility: 'all'
};

export function priceRangeError({ minPrice = '', maxPrice = '' }) {
  const values = [minPrice, maxPrice].filter(value => value !== '');
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return 'Informe preços iguais ou maiores que zero.';
  if (minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)) return 'O preço mínimo deve ser menor ou igual ao máximo.';
  return '';
}

export function performanceRangeError({ minPerformance = '', maxPerformance = '' }) {
  const values = [minPerformance, maxPerformance].filter(value => value !== '');
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) return 'Informe índices entre 0 e 100.';
  if (minPerformance !== '' && maxPerformance !== '' && Number(minPerformance) > Number(maxPerformance)) return 'O índice mínimo deve ser menor ou igual ao máximo.';
  return '';
}

export function catalogPerformanceScore(component) {
  const score = component?.performanceScore;
  return ['cpu', 'gpu', 'ram', 'storage'].includes(component?.category)
    && typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

export function componentValueScore(component) {
  const score = catalogPerformanceScore(component);
  return score !== null && typeof component.price === 'number' && Number.isFinite(component.price) && component.price > 0
    ? score / component.price * 1000 : null;
}

export function filterComponents(components, requestedFilters = {}, compatibilityById = {}) {
  const filters = { ...emptyCatalogFilters, ...requestedFilters };
  if (priceRangeError(filters) || performanceRangeError(filters)) return [];
  const terms = normalizeSearch(filters.search).split(' ').filter(Boolean);
  const comparable = ['cpu', 'gpu', 'ram', 'storage'].includes(filters.category);
  const result = components.filter(component => {
    const price = typeof component.price === 'number' && Number.isFinite(component.price) && component.price >= 0 ? component.price : null;
    const score = catalogPerformanceScore(component);
    const compatibility = compatibilityById[component.id];
    const status = typeof compatibility === 'string' ? compatibility : compatibility?.status;
    return (filters.category === 'all' || component.category === filters.category)
      && (filters.brand === 'all' || component.brand === filters.brand)
      && terms.every(term => componentSearchText(component).includes(term))
      && (filters.minPrice === '' || (price !== null && price >= Number(filters.minPrice)))
      && (filters.maxPrice === '' || (price !== null && price <= Number(filters.maxPrice)))
      && (!comparable || filters.minPerformance === '' || (score !== null && score >= Number(filters.minPerformance)))
      && (!comparable || filters.maxPerformance === '' || (score !== null && score <= Number(filters.maxPerformance)))
      && (filters.compatibility === 'all' || status === filters.compatibility)
      && Object.entries(filters.specs || {}).every(([key, value]) => {
        if (value === '' || value === 'all' || value == null) return true;
        // Stale selections from another category cannot silently hide its products.
        if (!(catalogFilterFields[filters.category] || []).includes(key)) return true;
        const actual = component.specs?.[key] ?? component.verifiedFeatures?.fields?.[key];
        return (Array.isArray(actual) ? actual : [actual]).some(entry => entry != null && String(entry) === String(value));
      });
  });
  const sort = /^(performance|value)-/.test(filters.sort) && !comparable ? 'name-asc' : filters.sort;
  const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
    || String(a.id || '').localeCompare(String(b.id || ''));
  const numeric = sort.startsWith('price-') ? component => typeof component.price === 'number' && Number.isFinite(component.price) && component.price >= 0 ? component.price : null
    : sort.startsWith('performance-') ? catalogPerformanceScore : sort.startsWith('value-') ? componentValueScore : null;
  return result.sort((a, b) => {
    if (!numeric) return (sort === 'name-desc' ? -1 : 1) * byName(a, b);
    const av = numeric(a), bv = numeric(b);
    if (av === null && bv === null) return byName(a, b);
    if (av === null) return 1;
    if (bv === null) return -1;
    return (sort.endsWith('-desc') ? bv - av : av - bv) || byName(a, b);
  });
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/wi[\s-]*fi/g, 'wifi').replace(/m[.\s]*2/g, 'm2').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function componentSearchText(component) {
  const fields = component.verifiedFeatures?.fields || {};
  const values = Object.entries(component.specs || {}).filter(([, value]) => value != null && value !== false).flatMap(([key, value]) => [specLabel(key), formatSpecValue(key, value)]);
  const features = Object.entries(fields).filter(([, value]) => value != null && value !== false).flatMap(([key, value]) => [verifiedFeatureFields[key] || key, formatVerifiedFeature(key, value)]);
  return normalizeSearch([component.name, component.brand, component.partNumber, ...values, ...features,
    fields.wifi ? 'wifi sem fio wireless' : '', fields.m2Slots ? 'm2 nvme' : ''].join(' '));
}
