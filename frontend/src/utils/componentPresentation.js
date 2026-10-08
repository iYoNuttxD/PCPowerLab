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
  baseClockGhz: 'GHz', boostClockGhz: 'GHz', tdpWatts: 'W', recommendedPsuWatts: 'W',
  heightMm: 'mm', radiatorSizeMm: 'mm', diameterMm: 'mm', thicknessMm: 'mm', maxCoolerHeightMm: 'mm', powerWatts: 'W', lengthMm: 'mm', maxGpuLengthMm: 'mm', speedMhz: 'MT/s', capacityGb: 'GB', vramGb: 'GB',
  readSpeedMbS: 'MB/s', writeSpeedMbS: 'MB/s', watts: 'W'
};

export function specLabel(key) {
  if (key === 'speedMhz') return 'Taxa de transferência';
  if (key === 'readSpeedMbS') return 'Leitura (até)';
  if (key === 'writeSpeedMbS') return 'Gravação (até)';
  return translateSpecLabel(key);
}

export function formatSpecValue(key, value) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return 'Não informado';
  if (key === 'fanMounts' && Array.isArray(value)) return value.map(mount => `${mount.diameterMm ?? '?'} mm: até ${mount.capacity ?? '?'} ventoinha(s)`).join('; ');
  if (key === 'radiatorSizesMm' && Array.isArray(value)) return value.map(size => `${size} mm`).join(', ');
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? JSON.stringify(item) : item).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (key === 'coolingType') return value === 'air' ? 'A ar' : value === 'aio' ? 'Líquida (AIO)' : String(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return units[key] && Number.isFinite(Number(value)) ? `${Number(value).toLocaleString('pt-BR')} ${units[key]}` : String(value);
}

export function specKeys(components) {
  return [...new Set([
    ...(componentSpecFields[components[0]?.category] || []),
    ...components.flatMap(component => Object.keys(component.specs || {}))
  ])];
}

export const emptyCatalogFilters = { search: '', brand: 'all', category: 'all', minPrice: '', maxPrice: '' };

export function priceRangeError({ minPrice, maxPrice }) {
  const values = [minPrice, maxPrice].filter(value => value !== '');
  if (values.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return 'Informe preços iguais ou maiores que zero.';
  if (minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)) return 'O preço mínimo deve ser menor ou igual ao máximo.';
  return '';
}

export function filterComponents(components, filters) {
  if (priceRangeError(filters)) return [];
  const term = normalizeSearch(filters.search);
  return components.filter(component => {
    const price = typeof component.price === 'number' && Number.isFinite(component.price) ? component.price : null;
    return (filters.category === 'all' || component.category === filters.category)
      && (filters.brand === 'all' || component.brand === filters.brand)
      && (!term || normalizeSearch(`${component.name || ''} ${component.brand || ''}`).includes(term))
      && (filters.minPrice === '' || (price !== null && price >= Number(filters.minPrice)))
      && (filters.maxPrice === '' || (price !== null && price <= Number(filters.maxPrice)));
  });
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
