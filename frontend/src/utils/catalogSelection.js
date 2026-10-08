// The catalog uses the same BuildProvider actions and fan-pack representation as the wizard.
export function isCatalogComponentSelected(selection, component) {
  return component.category === 'fan'
    ? (selection.fans || []).some(fan => (fan.id || fan.fanId) === component.id)
    : selection[component.category]?.id === component.id;
}

export function selectCatalogComponent(selection, actions, component) {
  if (isCatalogComponentSelected(selection, component)) return false;
  if (component.category === 'fan') actions.setFans([...(selection.fans || []), { ...component, quantity: 1 }]);
  else actions.selectComponent(component.category, component);
  return true;
}

export const catalogMethodology = 'Escopo: somente as peças cadastradas nesta base demonstrativa, não todo o mercado. Desempenho: índice interno demonstrativo de 0 a 100, apenas entre peças da mesma categoria (CPU, GPU, RAM ou armazenamento). Não é benchmark, FPS ou garantia de desempenho. Índice por real = índice ÷ preço de referência × 1.000 (pontos por R$ 1.000); não considera qualidade, consumo, compatibilidade ou preço atual. Dados ausentes aparecem como Não informado e ficam no fim da ordenação. Refrigeração, gabinete, fonte e placa-mãe não recebem pontuação de desempenho.';

export function formatCatalogScore(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : 'Não informado';
}
