import { catalogComponentTypes } from './componentLabels.js';

// Empty catalog is valid; malformed transport data is not an empty catalog.
export function validateCatalogResponse(data) {
  const ids = new Set();
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const textFields = ['name', 'brand', 'partNumber', 'specSourceUrl'];
  if (!Array.isArray(data) || data.some(component => {
    if (!component || typeof component !== 'object' || Array.isArray(component)
      || typeof component.id !== 'string' || !component.id.trim()
      || !catalogComponentTypes.includes(component.category) || ids.has(component.id)
      || textFields.some(key => component[key] != null && typeof component[key] !== 'string')
      || component.specs != null && !record(component.specs)
      || Array.isArray(component.specs?.fanMounts) && component.specs.fanMounts.some(mount => !record(mount))) return true;
    ids.add(component.id);
    return false;
  })) throw new Error('Resposta inválida do catálogo. Tente carregar as peças novamente.');
  return data;
}
