export const readyBuilds = [
  {
    id: 'ready-build-gaming-1080p',
    name: 'PC Gamer 1080p Custo-benefício',
    usageProfile: 'gaming',
    description: 'Configuração indicada para jogos em 1080p com bom equilíbrio entre preço e desempenho.',
    components: {
      cpuId: 'cpu-ryzen-5-5600',
      gpuId: 'gpu-rtx-4060',
      motherboardId: 'mb-b550m-aorus-elite',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-nv2-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    },
    targetBudgetRange: {
      min: 4000,
      max: 5500
    },
    expectedPerformanceLevel: 'good',
    recommendedFor: ['Jogos em 1080p', 'Uso geral', 'Streaming leve'],
    limitations: ['Não é indicada para jogos pesados em 4K.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-study-basic',
    name: 'PC para Estudos Essencial',
    usageProfile: 'study',
    description: 'Configuração simples para aulas online, pesquisas, documentos e navegação diária.',
    components: {
      cpuId: 'cpu-intel-i3-12100f',
      gpuId: 'gpu-gtx-1650',
      motherboardId: 'mb-h610m-ddr4',
      ramId: 'ram-kingston-fury-8gb-ddr4',
      storageId: 'ssd-kingston-a400-480gb',
      psuId: 'psu-corsair-cv550',
      caseId: 'case-cooler-master-q300l'
    },
    targetBudgetRange: {
      min: 2500,
      max: 3500
    },
    expectedPerformanceLevel: 'entry',
    recommendedFor: ['Estudos', 'Aulas online', 'Uso de escritório'],
    limitations: ['Memória limitada para multitarefa pesada.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-programming-balanced',
    name: 'PC para Programação Equilibrado',
    usageProfile: 'programming',
    description: 'Configuração para desenvolvimento, multitarefa, IDEs modernas e containers leves.',
    components: {
      cpuId: 'cpu-ryzen-7-5700x',
      gpuId: 'gpu-rx-6600',
      motherboardId: 'mb-b550m-aorus-elite',
      ramId: 'ram-kingston-fury-32gb-ddr4',
      storageId: 'ssd-wd-blue-sn570-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    },
    targetBudgetRange: {
      min: 4500,
      max: 6500
    },
    expectedPerformanceLevel: 'good',
    recommendedFor: ['Programação web', 'IDEs', 'Containers leves', 'Multitarefa'],
    limitations: ['Não prioriza GPU para workloads gráficos intensos.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-video-editing-pro',
    name: 'PC para Edição de Vídeo AM5',
    usageProfile: 'video-editing',
    description: 'Configuração forte para edição de vídeo, renderização e projetos criativos pesados.',
    components: {
      cpuId: 'cpu-ryzen-7-7700',
      gpuId: 'gpu-rtx-4070-super',
      motherboardId: 'mb-gigabyte-b650-gaming-x-ax',
      ramId: 'ram-corsair-vengeance-32gb-ddr5-5600',
      storageId: 'ssd-kingston-nv3-2tb',
      psuId: 'psu-xpg-core-reactor-850w',
      caseId: 'case-cooler-master-elite-502-white'
    },
    targetBudgetRange: {
      min: 11000,
      max: 15000
    },
    expectedPerformanceLevel: 'excellent',
    recommendedFor: ['Edição de vídeo', 'Renderizacao', 'Criação de conteúdo'],
    limitations: ['Custo elevado para uso casual.', 'Plataforma AM5 revisada; o desempenho deve ser reavaliado para cada aplicativo.', 'SSD NV3 prioriza capacidade e disponibilidade; não equivale à classe de desempenho e durabilidade do antigo 980 PRO.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-work-productivity',
    name: 'PC para Trabalho Produtivo',
    usageProfile: 'work',
    description: 'Configuração para produtividade, reuniões, planilhas, sistemas web e multitarefa moderada.',
    components: {
      cpuId: 'cpu-intel-i5-12400f',
      gpuId: 'gpu-rtx-3050',
      motherboardId: 'mb-h610m-ddr4',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-nv2-500gb',
      psuId: 'psu-corsair-cv550',
      caseId: 'case-cooler-master-q300l'
    },
    targetBudgetRange: {
      min: 3500,
      max: 5000
    },
    expectedPerformanceLevel: 'good',
    recommendedFor: ['Trabalho remoto', 'Produtividade', 'Multitarefa moderada'],
    limitations: ['Armazenamento pode ser limitado para grandes arquivos locais.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-streaming-1080p',
    name: 'PC para Streaming 1080p',
    usageProfile: 'streaming',
    description: 'Configuração para jogar e transmitir em 1080p com boa margem de CPU, GPU e memória.',
    components: {
      cpuId: 'cpu-ryzen-7-5700x',
      gpuId: 'gpu-rtx-4060-ti',
      motherboardId: 'mb-msi-b550-tomahawk',
      ramId: 'ram-kingston-fury-32gb-ddr4',
      storageId: 'ssd-wd-black-sn770-1tb',
      psuId: 'psu-corsair-rm750e',
      caseId: 'case-corsair-4000d-airflow'
    },
    targetBudgetRange: {
      min: 6500,
      max: 8500
    },
    expectedPerformanceLevel: 'good',
    recommendedFor: ['Streaming 1080p', 'Jogos em 1080p', 'Criação de conteúdo leve'],
    limitations: ['Não e focada em transmissão e jogo simultâneo em 4K.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-general-home',
    name: 'PC Uso Geral Residencial',
    usageProfile: 'general',
    description: 'Configuração versatil para navegação, estudos, midia, tarefas domesticas e jogos leves.',
    components: {
      cpuId: 'cpu-ryzen-5-5500',
      gpuId: 'gpu-gtx-1650',
      motherboardId: 'mb-b550m-aorus-elite',
      ramId: 'ram-kingston-fury-16gb-ddr4',
      storageId: 'ssd-kingston-a400-480gb',
      psuId: 'psu-corsair-cv550',
      caseId: 'case-mid-tower-airflow'
    },
    targetBudgetRange: {
      min: 3000,
      max: 4200
    },
    expectedPerformanceLevel: 'basic',
    recommendedFor: ['Uso geral', 'Navegacao', 'Midia', 'Jogos leves'],
    limitations: ['Não indicada para jogos AAA recentes em qualidade alta.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-cost-benefit-1440p-entry',
    name: 'PC Custo-benefício Forte',
    usageProfile: 'cost-benefit',
    description: 'Configuração equilibrada para quem busca bom desempenho por real investido.',
    components: {
      cpuId: 'cpu-intel-i5-12400f',
      gpuId: 'gpu-rx-7600',
      motherboardId: 'mb-msi-pro-b660m-a-ddr4',
      ramId: 'ram-corsair-vengeance-16gb-ddr4-3600',
      storageId: 'ssd-kingston-nv2-1tb',
      psuId: 'psu-corsair-650w',
      caseId: 'case-mid-tower-airflow'
    },
    targetBudgetRange: {
      min: 4500,
      max: 6000
    },
    expectedPerformanceLevel: 'good',
    recommendedFor: ['Custo-benefício', 'Jogos em 1080p', 'Uso misto'],
    limitations: ['Pode exigir upgrade de RAM para multitarefa pesada.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  },
  {
    id: 'ready-build-high-performance',
    name: 'PC Alta Performance',
    usageProfile: 'high-performance',
    description: 'Configuração premium para jogos pesados, multitarefa intensa e workloads exigentes.',
    components: {
      cpuId: 'cpu-ryzen-7-7700',
      gpuId: 'gpu-rx-7800-xt',
      motherboardId: 'mb-gigabyte-b650-gaming-x-ax',
      ramId: 'ram-gskill-trident-z5-32gb-ddr5-6000',
      storageId: 'ssd-kingston-nv3-2tb',
      psuId: 'psu-corsair-rm850x',
      caseId: 'case-cooler-master-elite-502-white'
    },
    targetBudgetRange: {
      min: 10000,
      max: 14000
    },
    expectedPerformanceLevel: 'excellent',
    recommendedFor: ['Jogos pesados', '1440p alto', 'Workloads exigentes'],
    limitations: ['Investimento alto para usuários iniciantes.'],
    createdAt: '2026-05-22T12:00:00.000Z'
  }
];