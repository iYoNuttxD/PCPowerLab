import { componentLabels, priorityLabels, usageLabels } from './componentLabels.js';

export const severityLabels = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto'
};

export const statusLabels = {
  'Within Range': 'Dentro da faixa',
  'within range': 'Dentro da faixa',
  within_range: 'Dentro da faixa',
  'within-range': 'Dentro da faixa',
  withinRange: 'Dentro da faixa',
  within_budget: 'Dentro do orçamento',
  above_budget: 'Acima do orçamento',
  over_budget: 'Acima do orçamento',
  near_budget: 'Próximo do orçamento',
  balanced: 'Equilibrado',
  moderate: 'Moderado',
  relevant: 'Relevante',
  compatible: 'Compatível',
  incompatible: 'Incompatível',
  unverified: 'Não verificada',
  unverified_compatibility: 'Compatibilidade pendente',
  performance_model_unavailable: 'Esta configuração inclui componentes sem parâmetros de desempenho calibrados. Não é possível estimar seu desempenho.',
  fans: 'Ventoinhas',
  excellent: 'Excelente',
  good: 'Bom',
  entry: 'Entrada',
  basic: 'Básico',
  poor: 'Insuficiente',
  insufficient: 'Insuficiente',
  recommended: 'Recomendado',
  belowRecommended: 'Abaixo do recomendado',
  belowMinimum: 'Abaixo do mínimo',
  minimum: 'Mínimo',
  Basico: 'Básico',
  available: 'Disponível',
  unavailable: 'Indisponível',
  unknown: 'Consultar',
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
  memorySlots: 'Slots de memória', maxMemoryGb: 'Memória máxima', capacityPerModuleGb: 'Capacidade por módulo',
  casLatency: 'Latência CAS', voltageV: 'Tensão', rgb: 'Iluminação RGB', color: 'Cor',
  dimensionsMm: 'Dimensões', radiatorDimensionsMm: 'Dimensões do radiador',
  radiatorThicknessMm: 'Espessura do radiador', fanDiameterMm: 'Diâmetro das ventoinhas', fanThicknessMm: 'Espessura das ventoinhas',
  totalEnvelopeThicknessMm: 'Espessura total conservadora', maxRadiatorThicknessMm: 'Espessura máxima de radiador',
  powerBasis: 'Base do consumo', auxiliaryPowerUnknown: 'Consumo auxiliar não verificado', auxiliaryPowerNotes: 'Observação sobre consumo auxiliar',
  compatibilityNotes: 'Observações de compatibilidade', coolingSupportNotes: 'Posições e limites de refrigeração',
  memorySupportNotes: 'Condições de suporte à memória', storageSupportNotes: 'Condições dos slots de armazenamento',
  m2LengthMm: 'Comprimento M.2', m2SupportedLengthsMm: 'Comprimentos M.2 suportados', m2Slots: 'Slots M.2', sataPorts: 'Portas SATA',
  cpuFanHeaders: 'Conectores para cooler', systemFanHeaders: 'Conectores para ventoinhas', pcieGeneration: 'Geração PCIe',
  enduranceTBW: 'Durabilidade declarada (TBW)', frontRadiatorMaxThicknessMm: 'Espessura máxima do radiador frontal',
  maxGpuLengthWithHddBracketMm: 'Limite de GPU com suporte de HD', maxGpuLengthWithoutFrontRadiatorMm: 'Limite de GPU sem radiador frontal',
  includedFanDiameterMm: 'Diâmetro das ventoinhas incluídas',

  coolingType: 'Tipo de refrigeração', supportedSockets: 'Sockets suportados', heightMm: 'Altura', radiatorSizeMm: 'Tamanho do radiador', powerWatts: 'Consumo por unidade', diameterMm: 'Diâmetro', thicknessMm: 'Espessura', connector: 'Conector', unitsPerPack: 'Ventoinhas por pacote', maxCoolerHeightMm: 'Altura máxima do cooler', radiatorSizesMm: 'Radiadores suportados (mm)', fanMounts: 'Suportes para ventoinhas', coolingSupportVerified: 'Suporte de refrigeração verificado', includedFans: 'Ventoinhas incluídas', fanMountsShared: 'Suportes compartilhados', radiatorFanSlots: 'Slots ocupados pelo radiador',
  dataRateMTs: 'Taxa de transferência',
  modulesPerKit: 'Módulos por kit',
  speedProfile: 'Perfil de velocidade',
  maxFanThicknessMm: 'Espessura máxima da ventoinha',
  includedFanCount: 'Ventoinhas incluídas',
  chipset: 'Chipset da placa-mãe',
  socket: 'Encaixe do processador (socket)',
  cores: 'Núcleos',
  threads: 'Threads',
  baseClockGhz: 'Frequência base',
  boostClockGhz: 'Frequência turbo',
  baseClock: 'Frequência base',
  boostClock: 'Frequência turbo',
  maximumTurboPowerWatts: 'Potência máxima em turbo (W)',
  includesCpuCooler: 'Cooler incluído',
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
  CASE_GPU_LENGTH_UNVERIFIED: 'Espaço da placa de vídeo não verificado',
  CASE_GPU_LENGTH_INCOMPATIBLE: 'Placa de vídeo grande para o gabinete',
  REQUIRED_COMPONENT_MISSING: 'Componente obrigatório ausente',
  COOLER_SOCKET_UNVERIFIED: 'Encaixe do cooler a confirmar',
  AIR_COOLER_CLEARANCE_UNVERIFIED: 'Espaço ao redor do cooler a confirmar',
  COOLER_HEIGHT_UNVERIFIED: 'Altura disponível a confirmar',
  RADIATOR_SIZE_UNVERIFIED: 'Tamanho do radiador a confirmar',
  RADIATOR_CLEARANCE_UNVERIFIED: 'Posição e espaço do radiador a confirmar',
  COOLER_TYPE_UNVERIFIED: 'Tipo de refrigeração não informado',
  FAN_DIAMETER_UNVERIFIED: 'Diâmetro das ventoinhas a confirmar',
  FAN_THICKNESS_UNVERIFIED: 'Espessura das ventoinhas a confirmar',
  FAN_CAPACITY_UNVERIFIED: 'Quantidade de ventoinhas a confirmar',
  FAN_LAYOUT_UNVERIFIED: 'Posições das ventoinhas a confirmar',
  FAN_CONNECTORS_UNVERIFIED: 'Conexões elétricas das ventoinhas a confirmar',
  COOLING_POWER_UNVERIFIED: 'Consumo da refrigeração não informado',
  COOLER_CPU_SOCKET_INCOMPATIBLE: 'Cooler incompatível com o processador',
  CASE_COOLER_HEIGHT_INCOMPATIBLE: 'Cooler alto demais para o gabinete',
  CASE_RADIATOR_SIZE_INCOMPATIBLE: 'Radiador incompatível com o gabinete',
  CASE_FAN_DIAMETER_INCOMPATIBLE: 'Ventoinha incompatível com o suporte',
  CASE_FAN_THICKNESS_INCOMPATIBLE: 'Ventoinha espessa demais para o gabinete',
  CASE_FAN_CAPACITY_EXCEEDED: 'Ventoinhas excedem os espaços disponíveis'
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

// Presentation-only cleanup of known legacy Portuguese messages; keep IDs and API values intact.
export function readableMessage(value) {
  if (typeof value !== 'string') return value;
  const words = { atencao: 'atenção', configuracao: 'configuração', configuracoes: 'configurações', fans: 'ventoinhas', nao: 'não', verificacoes: 'verificações', analise: 'análise' };
  return value.replace(/\bos fans incluídos\b/gi, phrase => phrase[0] === 'O' ? 'As ventoinhas incluídas' : 'as ventoinhas incluídas')
    .replace(/\b(atencao|configuracao|configuracoes|fans|nao|verificacoes|analise)\b/gi, word => {
    const replacement = words[word.toLowerCase()];
    return word[0] === word[0].toUpperCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
  });
}
