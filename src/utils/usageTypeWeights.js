export const supportedUsageTypes = [
  'gaming',
  'work',
  'video-editing',
  'programming',
  'design',
  'general',
  'study',
  'streaming',
  'upgrade',
  'productivity'
];

export const usageSlotWeights = {
  gaming: {
    cpu: 1.3,
    gpu: 1.45,
    motherboard: 0.95,
    ram: 1.15,
    storage: 1.1,
    psu: 0.9,
    case: 0.85
  },
  work: {
    cpu: 1.3,
    gpu: 1.05,
    motherboard: 0.95,
    ram: 1.25,
    storage: 1.2,
    psu: 0.9,
    case: 0.8
  },
  'video-editing': {
    cpu: 1.35,
    gpu: 1.25,
    motherboard: 0.95,
    ram: 1.25,
    storage: 1.15,
    psu: 0.95,
    case: 0.85
  },
  programming: {
    cpu: 1.35,
    gpu: 1.1,
    motherboard: 0.95,
    ram: 1.3,
    storage: 1.25,
    psu: 0.9,
    case: 0.8
  },
  design: {
    cpu: 1.2,
    gpu: 1.3,
    motherboard: 0.95,
    ram: 1.25,
    storage: 1.15,
    psu: 0.9,
    case: 0.85
  },
  general: {
    cpu: 1.3,
    gpu: 1.25,
    motherboard: 0.95,
    ram: 1.2,
    storage: 1.15,
    psu: 0.95,
    case: 0.8
  },
  study: {
    cpu: 1.15,
    gpu: 0.9,
    motherboard: 1,
    ram: 1.05,
    storage: 1.05,
    psu: 0.9,
    case: 0.8
  },
  streaming: {
    cpu: 1.3,
    gpu: 1.25,
    motherboard: 0.95,
    ram: 1.2,
    storage: 1.05,
    psu: 0.95,
    case: 0.8
  },
  upgrade: {
    cpu: 1.25,
    gpu: 1.25,
    motherboard: 0.95,
    ram: 1.15,
    storage: 1.15,
    psu: 0.9,
    case: 0.8
  },
  productivity: {
    cpu: 1.3,
    gpu: 1.05,
    motherboard: 0.95,
    ram: 1.25,
    storage: 1.2,
    psu: 0.9,
    case: 0.8
  }
};

export const usageTypeStrategies = {
  gaming: 'Prioridade para placa de vídeo e equilíbrio com processador.',
  work: 'Prioridade para CPU, RAM e armazenamento equilibrado para carga de trabalho.',
  'video-editing': 'Prioridade para CPU, RAM, GPU e armazenamento rápido.',
  programming: 'Prioridade para CPU, RAM e SSD para compilação e multitarefa.',
  design: 'Prioridade para GPU, RAM e qualidade geral do sistema.',
  general: 'Prioridade para custo-benefício e equilíbrio entre componentes.',
  study: 'Prioridade para preço baixo, estabilidade e uso básico.',
  streaming: 'Prioridade para CPU, GPU e RAM para transmissões ao vivo.',
  upgrade: 'Prioridade para melhoria do componente mais fraco em uma build existente.',
  productivity: 'Prioridade para CPU, RAM e armazenamento para produtividade.'
};

export const usageTypeSummaries = {
  gaming: 'Configuração recomendada para jogos com foco em custo-benefício.',
  work: 'Configuração recomendada para trabalho com equilíbrio entre CPU, RAM e armazenamento.',
  'video-editing': 'Configuração recomendada para edição de vídeo com CPU forte, RAM e armazenamento rápido.',
  programming: 'Configuração recomendada para programação com foco em CPU, RAM e SSD.',
  design: 'Configuração recomendada para design com foco em GPU, RAM e qualidade geral.',
  general: 'Configuração recomendada para uso geral com foco em custo-benefício.',
  study: 'Configuração recomendada para estudo com foco em preço baixo e estabilidade.',
  streaming: 'Configuração recomendada para streaming com CPU, GPU e RAM mais equilibrados.',
  upgrade: 'Configuração recomendada para upgrade com foco em melhorar o ponto mais fraco.',
  productivity: 'Configuração recomendada para produtividade com equilíbrio entre CPU, RAM e armazenamento.'
};
