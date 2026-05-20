export const upgradePrioritiesByUsageType = {
  gaming: ['gpu', 'cpu', 'ram', 'storage'],
  programming: ['ram', 'cpu', 'storage', 'gpu'],
  'video-editing': ['cpu', 'ram', 'gpu', 'storage'],
  productivity: ['cpu', 'ram', 'storage', 'gpu'],
  work: ['cpu', 'ram', 'storage', 'gpu'],
  general: ['gpu', 'cpu', 'ram', 'storage'],
  streaming: ['cpu', 'gpu', 'ram', 'storage'],
  study: ['storage', 'ram', 'cpu', 'gpu'],
  upgrade: ['gpu', 'cpu', 'ram', 'storage']
};

export function getUpgradeImpact(scoreGain) {
  if (scoreGain >= 20) {
    return 'high';
  }

  if (scoreGain >= 10) {
    return 'medium';
  }

  return 'low';
}

export function getUpgradePrioritySlots({ usageType, bottleneckAnalysis }) {
  const bottleneckSlots = Array.isArray(bottleneckAnalysis?.bottlenecks)
    ? bottleneckAnalysis.bottlenecks
      .map((bottleneck) => bottleneck.component)
      .filter((component) => ['cpu', 'gpu', 'ram', 'storage', 'psu'].includes(component))
    : [];
  const usageSlots = upgradePrioritiesByUsageType[usageType] || upgradePrioritiesByUsageType.general;

  return [...new Set([...bottleneckSlots, ...usageSlots])];
}

export function buildUpgradeReason({ componentType, expectedImpact, usageType, hasBottleneck }) {
  if (hasBottleneck) {
    return `O componente ${componentType} aparece como limitador da configuracao. A troca deve gerar impacto ${expectedImpact} para ${usageType}.`;
  }

  return `Para o perfil ${usageType}, o upgrade de ${componentType} oferece a melhor evolucao encontrada dentro das restricoes informadas.`;
}
