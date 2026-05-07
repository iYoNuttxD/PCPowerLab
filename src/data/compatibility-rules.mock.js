export const compatibilityRules = [
  {
    id: 'rule-001',
    name: 'CPU socket must match motherboard socket',
    sourceType: 'cpu',
    targetType: 'motherboard',
    field: 'socket',
    targetField: 'socket',
    operator: 'equals',
    severity: 'high',
    active: true,
    priority: 10,
    message: 'O socket do processador deve ser compatível com o socket da placa-mãe.'
  },
  {
    id: 'rule-002',
    name: 'RAM memory type must match motherboard memory type',
    sourceType: 'ram',
    targetType: 'motherboard',
    field: 'memoryType',
    targetField: 'memoryType',
    operator: 'equals',
    severity: 'high',
    active: true,
    priority: 20,
    message: 'O tipo de memória RAM deve ser compatível com o tipo aceito pela placa-mãe.'
  },
  {
    id: 'rule-003',
    name: 'Motherboard form factor must be supported by case',
    sourceType: 'motherboard',
    targetType: 'case',
    field: 'formFactor',
    targetField: 'supportedFormFactors',
    operator: 'includes',
    severity: 'medium',
    active: true,
    priority: 30,
    message: 'O gabinete deve suportar o formato da placa-mãe selecionada.'
  },
  {
    id: 'rule-004',
    name: 'GPU length must fit inside case',
    sourceType: 'gpu',
    targetType: 'case',
    field: 'lengthMm',
    targetField: 'maxGpuLengthMm',
    operator: 'lessThanOrEqual',
    severity: 'medium',
    active: true,
    priority: 40,
    message: 'O comprimento da placa de vídeo deve ser compatível com o espaço disponível no gabinete.'
  },
  {
    id: 'rule-005',
    name: 'PSU wattage must cover estimated build consumption',
    sourceType: 'psu',
    targetType: 'build',
    field: 'watts',
    targetField: 'estimatedConsumptionWatts',
    operator: 'greaterThanOrEqual',
    severity: 'high',
    active: true,
    priority: 50,
    message: 'A potência da fonte deve atender ao consumo estimado da configuração.'
  }
];
