import { componentLabels, priorityLabels, usageLabels } from './componentLabels.js';

export const severityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
};

export const statusLabels = {
  within_budget: 'Dentro do orçamento',
  above_budget: 'Acima do orçamento',
  over_budget: 'Acima do orçamento',
  near_budget: 'Próximo do orçamento',
  balanced: 'Equilibrado',
  moderate: 'Moderado',
  relevant: 'Relevante',
  compatible: 'Compatível',
  incompatible: 'Incompatível',
  excellent: 'Excelente',
  good: 'Bom',
  basic: 'Básico',
  poor: 'Insuficiente',
  recommended: 'Recomendado',
  belowRecommended: 'Abaixo do recomendado',
  minimum: 'Mínimo',
  available: 'Disponível',
  unavailable: 'Indisponível',
  unknown: 'Não informado',
  in_stock: 'Em estoque',
  out_of_stock: 'Fora de estoque',
  limited_stock: 'Estoque limitado',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
  build: 'Build completa',
  equals: 'Igual',
  includes: 'Contém',
  lessThanOrEqual: 'Menor ou igual',
  greaterThanOrEqual: 'Maior ou igual'
};

export const bottleneckReasonLabels = {
  incompatible_build: 'Build incompatível',
  missing_performance_parameters: 'Parâmetros de desempenho insuficientes',
  network_error: 'Falha de conexão',
  unexpected_error: 'Erro inesperado'
};

export const specLabels = {
  socket: 'Socket',
  cores: 'Núcleos',
  threads: 'Threads',
  baseClockGhz: 'Frequência base',
  boostClockGhz: 'Frequência turbo',
  baseClock: 'Frequência base',
  boostClock: 'Frequência turbo',
  tdpWatts: 'Consumo térmico estimado',
  tdp: 'Consumo térmico estimado',
  memoryType: 'Tipo de memória',
  vram: 'Memória de vídeo',
  vramGb: 'Memória de vídeo',
  capacityGb: 'Capacidade',
  capacity: 'Capacidade',
  speedMhz: 'Velocidade',
  speed: 'Velocidade',
  interface: 'Interface',
  watts: 'Potência',
  wattage: 'Potência',
  efficiency: 'Eficiência',
  formFactor: 'Formato',
  supportedFormFactors: 'Formatos suportados',
  formFactorSupport: 'Formatos suportados',
  maxGpuLengthMm: 'Comprimento máximo de GPU',
  maxGpuLength: 'Comprimento máximo de GPU',
  lengthMm: 'Comprimento da placa',
  recommendedPsuWatts: 'Potência recomendada da fonte',
  recommendedPsu: 'Potência recomendada da fonte',
  storageInterfaces: 'Interfaces de armazenamento',
  readSpeedMbS: 'Velocidade de leitura',
  writeSpeedMbS: 'Velocidade de gravação',
  readSpeed: 'Velocidade de leitura',
  writeSpeed: 'Velocidade de gravação',
  storageType: 'Tipo de armazenamento',
  performanceScore: 'Pontuação de desempenho',
  gamingScore: 'Pontuação em jogos',
  productivityScore: 'Pontuação em produtividade'
};

export const metricLabels = {
  estimatedWatts: 'Consumo estimado da configuração',
  estimatedConsumptionWatts: 'Consumo estimado da configuração',
  estimatedPowerWatts: 'Consumo estimado da configuração',
  psuWatts: 'Potência da fonte selecionada',
  recommendedWatts: 'Potência recomendada para segurança',
  recommendedPsuWatts: 'Potência recomendada da fonte',
  powerUsage: 'Consumo de energia',
  powerConsumption: 'Consumo de energia',
  totalPowerConsumption: 'Consumo total estimado',
  safetyMargin: 'Margem de segurança',
  safetyMarginWatts: 'Margem de segurança da fonte',
  tdpTotal: 'Consumo estimado dos componentes',
  cpuScore: 'Desempenho do processador',
  gpuScore: 'Desempenho da placa de vídeo',
  ramScore: 'Desempenho da memória RAM',
  storageScore: 'Desempenho do armazenamento'
};

export const bottleneckTypeLabels = {
  cpu_bottleneck: 'Gargalo de processador',
  gpu_bottleneck: 'Gargalo de placa de vídeo',
  ram_limitation: 'Limitação de memória RAM',
  storage_limitation: 'Limitação de armazenamento',
  psu_headroom_warning: 'Atenção na fonte'
};

export const issueCodeLabels = {
  CPU_MOTHERBOARD_SOCKET_INCOMPATIBLE: 'Socket de processador incompatível',
  RAM_MOTHERBOARD_TYPE_INCOMPATIBLE: 'Tipo de memória incompatível',
  STORAGE_INTERFACE_INCOMPATIBLE: 'Interface de armazenamento incompatível',
  PSU_POWER_BELOW_RECOMMENDED: 'Fonte abaixo do recomendado',
  CASE_MOTHERBOARD_FORM_FACTOR_INCOMPATIBLE: 'Gabinete incompatível com placa-mãe',
  CASE_GPU_LENGTH_INCOMPATIBLE: 'Placa de vídeo grande para o gabinete',
  REQUIRED_COMPONENT_MISSING: 'Componente obrigatório ausente'
};

export function translateValue(value, fallback = 'Não informado') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return componentLabels[value]
    || severityLabels[value]
    || usageLabels[value]
    || priorityLabels[value]
    || statusLabels[value]
    || bottleneckTypeLabels[value]
    || issueCodeLabels[value]
    || bottleneckReasonLabels[value]
    || metricLabels[value]
    || specLabels[value]
    || humanizeTechnicalKey(value);
}

export function translateSeverity(value) {
  return severityLabels[value] || translateValue(value);
}

export function translateComponent(value) {
  return componentLabels[value] || translateValue(value);
}

export function translateBottleneckType(value) {
  return bottleneckTypeLabels[value] || translateValue(value);
}

export function translateSpecLabel(value) {
  return specLabels[value] || translateValue(value);
}

export function translateMetricLabel(value) {
  return metricLabels[value] || translateValue(value);
}

function humanizeTechnicalKey(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
