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
  baseClockGhz: 'Clock base',
  boostClockGhz: 'Clock boost',
  tdpWatts: 'TDP',
  memoryType: 'Tipo de memória',
  capacityGb: 'Capacidade',
  speedMhz: 'Velocidade',
  interface: 'Interface',
  watts: 'Potência',
  efficiency: 'Eficiência',
  formFactor: 'Formato',
  supportedFormFactors: 'Formatos suportados',
  maxGpuLengthMm: 'GPU máxima',
  lengthMm: 'Comprimento',
  recommendedPsuWatts: 'Fonte recomendada',
  storageInterfaces: 'Interfaces de armazenamento'
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
    || specLabels[value]
    || String(value);
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
