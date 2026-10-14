export const componentTypes = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];

export const catalogComponentTypes = [...componentTypes, 'cooler', 'fan'];

export const componentLabels = {
  cpu: 'Processador',
  gpu: 'Placa de vídeo',
  motherboard: 'Placa-mãe',
  ram: 'Memória RAM',
  storage: 'Armazenamento',
  psu: 'Fonte de alimentação',
  case: 'Gabinete',
  cooler: 'Cooler do processador',
  fan: 'Ventoinha',
  fans: 'Ventoinhas'
};

export const usageTypes = [
  'gaming',
  'work',
  'video-editing',
  'programming',
  'design',
  'general',
  'study',
  'streaming',
  'upgrade'
];

export const usageLabels = {
  gaming: 'Jogos',
  work: 'Trabalho',
  'video-editing': 'Edição de vídeo',
  programming: 'Programação',
  design: 'Design',
  general: 'Uso geral',
  study: 'Estudos',
  streaming: 'Streaming',
  upgrade: 'Upgrade',
  'cost-benefit': 'Custo-benefício',
  'high-performance': 'Alto desempenho'
};

export const priorityOptions = [
  'cost-benefit',
  'performance',
  'balanced',
  'lowest-price',
  'upgrade-ready'
];

export const priorityLabels = {
  'cost-benefit': 'Custo-benefício',
  performance: 'Desempenho',
  budget: 'Orçamento',
  balanced: 'Equilibrado',
  'lowest-price': 'Menor preço de referência',
  'upgrade-ready': 'Preparado para upgrade'
};
