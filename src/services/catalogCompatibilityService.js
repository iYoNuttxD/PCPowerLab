import { findComponentById, listComponents } from './component.service.js';
import { requiredBuildSlots, selectOptionalBuildComponents } from './build.service.js';
import { evaluateResolvedBuildCompatibility } from './compatibility.service.js';

export function previewCatalogCompatibility(selection = {}, category) {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection)) {
    throw Object.assign(new Error('Informe uma selecao de componentes valida.'), { statusCode: 400 });
  }
  const build = { ...selectOptionalBuildComponents(selection) };
  const nested = selection.components || {};
  for (const slot of requiredBuildSlots) {
    const id = selection[`${slot}Id`] ?? selection[slot] ?? nested[slot] ?? nested[`${slot}Id`];
    if (id === undefined || id === null || id === '') continue;
    const component = typeof id === 'string' ? findComponentById(id.trim()) : null;
    if (!component || component.category !== slot) {
      throw Object.assign(new Error(`Componente invalido para ${slot}.`), { statusCode: 400 });
    }
    build[slot] = component;
  }
  return listComponents({ category }).map(candidate => {
    const candidateBuild = { ...build };
    if (candidate.category === 'fan') {
      // Same choice as the builder: add one pack only when it is not already selected.
      const existing = (build.fans || []).find(fan => fan.id === candidate.id);
      candidateBuild.fans = (build.fans || []).filter(fan => fan.id !== candidate.id)
        .concat({ ...candidate, quantity: existing?.quantity || 1 });
    } else candidateBuild[candidate.category] = candidate;
    return { componentId: candidate.id, ...evaluateResolvedBuildCompatibility(candidateBuild) };
  });
}
