import { isSelectableComponent } from './catalogAvailability.js';
// The catalog uses the same BuildProvider actions and fan-pack representation as the wizard.
export function isCatalogComponentSelected(selection, component) {
  return component.category === 'fan'
    ? (selection.fans || []).some(fan => (fan.id || fan.fanId) === component.id)
    : selection[component.category]?.id === component.id;
}

export function selectCatalogComponent(selection, actions, component) {
  if (!isSelectableComponent(component) || isCatalogComponentSelected(selection, component)) return false;
  if (component.category === 'fan') actions.setFans([...(selection.fans || []), { ...component, quantity: 1 }]);
  else actions.selectComponent(component.category, component);
  return true;
}

export const catalogMethodology = 'Pontuações simuladas de 0 a 100: compare peças da mesma categoria. Sem benchmark medido; os pontos não são FPS. Índice por R$ 1.000 = pontuação ÷ preço × 1.000. Os índices comparam somente este catálogo; dados ausentes aparecem como Não informado.';

export function formatCatalogScore(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'Não informado';
}
