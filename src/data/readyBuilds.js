// Current preset recipes change explicitly; saved build snapshots are never migrated.
export const readyBuilds = [
  {
    'id': 'ready-build-gaming-1080p',
    'name': 'PC Gamer 1080p Custo-benefício',
    'usageProfile': 'gaming',
    'description': 'Configuração indicada para jogos em 1080p com bom equilíbrio entre preço e desempenho.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-7-5700x',
      'gpuId': 'gpu-msi-rtx-4060-ventus-2x-black-8g-oc',
      'ramId': 'ram-cmg16gx4m2e3200c16',
      'storageId': 'ssd-snv3s-1000g'
    },
    'targetBudgetRange': {
      'min': 4000,
      'max': 5500
    },
    'expectedPerformanceLevel': 'good',
    'recommendedFor': [
      'Jogos em 1080p',
      'Uso geral',
      'Streaming leve'
    ],
    'limitations': [
      'Não é indicada para jogos pesados em 4K.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-study-basic',
    'name': 'PC para Estudos Essencial',
    'usageProfile': 'study',
    'description': 'Configuração simples para aulas online, pesquisas, documentos e navegação diária.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-5-5500',
      'gpuId': 'gpu-gigabyte-rx-7600-gaming-oc-8g',
      'ramId': 'ram-apacer-nox-rgb-8gb-3200',
      'storageId': 'ssd-kingston-a400-240gb'
    },
    'targetBudgetRange': {
      'min': 2500,
      'max': 3500
    },
    'expectedPerformanceLevel': 'entry',
    'recommendedFor': [
      'Estudos',
      'Aulas online',
      'Uso de escritório'
    ],
    'limitations': [
      'Memória limitada para multitarefa pesada.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-programming-balanced',
    'name': 'PC para Programação Equilibrado',
    'usageProfile': 'programming',
    'description': 'Configuração para desenvolvimento, multitarefa, IDEs modernas e containers leves.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-7-5700x',
      'gpuId': 'gpu-gigabyte-rx-7600-gaming-oc-8g',
      'ramId': 'ram-kvr32n22d8-32',
      'storageId': 'ssd-xpg-gammix-s70-blade-1tb'
    },
    'targetBudgetRange': {
      'min': 4500,
      'max': 6500
    },
    'expectedPerformanceLevel': 'good',
    'recommendedFor': [
      'Programação web',
      'IDEs',
      'Containers leves',
      'Multitarefa'
    ],
    'limitations': [
      'Não prioriza GPU para workloads gráficos intensos.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-video-editing-pro',
    'name': 'PC para Edição de Vídeo AM5',
    'usageProfile': 'video-editing',
    'description': 'Seleção de hardware para este perfil; estimativa de desempenho indisponível para a GPU revisada.',
    'components': {
      'cpuId': 'cpu-ryzen-7-7700',
      'gpuId': 'gpu-gigabyte-rtx-5070-windforce-oc-sff-12g',
      'motherboardId': 'mb-gigabyte-b650m-d3hp',
      'ramId': 'ram-kf556c36bweak2-32',
      'storageId': 'ssd-kingston-nv3-2tb',
      'psuId': 'psu-corsair-rm750e-2025',
      'caseId': 'case-cooler-master-elite-502-white'
    },
    'targetBudgetRange': {
      'min': 11000,
      'max': 15000
    },
    'expectedPerformanceLevel': 'unavailable',
    'recommendedFor': [
      'Edição de vídeo',
      'Renderizacao',
      'Criação de conteúdo'
    ],
    'limitations': [
      'Custo elevado para uso casual.',
      'Plataforma AM5 revisada; o desempenho deve ser reavaliado para cada aplicativo.',
      'SSD NV3 prioriza capacidade e disponibilidade; não equivale à classe de desempenho e durabilidade do antigo 980 PRO.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.',
      'Nova GPU sem calibração de pontuação/FPS; não herda a estimativa anterior.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-work-productivity',
    'name': 'PC para Trabalho Produtivo',
    'usageProfile': 'work',
    'description': 'Configuração para produtividade, reuniões, planilhas, sistemas web e multitarefa moderada.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-5-5500',
      'gpuId': 'gpu-gigabyte-rx-7600-gaming-oc-8g',
      'ramId': 'ram-mancer-vant-s-16gb-3200',
      'storageId': 'ssd-kingston-a400-240gb'
    },
    'targetBudgetRange': {
      'min': 3500,
      'max': 5000
    },
    'expectedPerformanceLevel': 'good',
    'recommendedFor': [
      'Trabalho remoto',
      'Produtividade',
      'Multitarefa moderada'
    ],
    'limitations': [
      'Armazenamento pode ser limitado para grandes arquivos locais.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.',
      'Memória de módulo único CL19; não equivale a um kit de dois módulos CL16.',
      'SSD de 240 GB prioriza custo; confira se a capacidade atende seus arquivos.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-streaming-1080p',
    'name': 'PC para Streaming 1080p',
    'usageProfile': 'streaming',
    'description': 'Configuração para jogar e transmitir em 1080p com boa margem de CPU, GPU e memória.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-corsair-rm750e-2025',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-7-5700x',
      'gpuId': 'gpu-gigabyte-rtx-3060-windforce-oc-12g-rev2',
      'ramId': 'ram-kf432c16bb12ak2-32',
      'storageId': 'ssd-xpg-gammix-s70-blade-1tb'
    },
    'targetBudgetRange': {
      'min': 6500,
      'max': 8500
    },
    'expectedPerformanceLevel': 'good',
    'recommendedFor': [
      'Streaming 1080p',
      'Jogos em 1080p',
      'Criação de conteúdo leve'
    ],
    'limitations': [
      'Não e focada em transmissão e jogo simultâneo em 4K.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-general-home',
    'name': 'PC Uso Geral Residencial',
    'usageProfile': 'general',
    'description': 'Configuração versatil para navegação, estudos, midia, tarefas domesticas e jogos leves.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-5-5500',
      'gpuId': 'gpu-gigabyte-rx-7600-gaming-oc-8g',
      'ramId': 'ram-mancer-vant-s-16gb-3200',
      'storageId': 'ssd-kingston-a400-240gb'
    },
    'targetBudgetRange': {
      'min': 3000,
      'max': 4200
    },
    'expectedPerformanceLevel': 'basic',
    'recommendedFor': [
      'Uso geral',
      'Navegacao',
      'Midia',
      'Jogos leves'
    ],
    'limitations': [
      'Não indicada para jogos AAA recentes em qualidade alta.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.',
      'Memória de módulo único CL19; não equivale a um kit de dois módulos CL16.',
      'SSD de 240 GB prioriza custo; confira se a capacidade atende seus arquivos.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-cost-benefit-1440p-entry',
    'name': 'PC Custo-benefício Forte',
    'usageProfile': 'cost-benefit',
    'description': 'Configuração equilibrada para quem busca bom desempenho por real investido.',
    'components': {
      'motherboardId': 'mb-asus-tuf-b550m-plus',
      'psuId': 'psu-coolermaster-mwe-gold650-v3',
      'caseId': 'case-cooler-master-elite-502-white',
      'cpuId': 'cpu-ryzen-5-5500',
      'gpuId': 'gpu-gigabyte-rx-7600-gaming-oc-8g',
      'ramId': 'ram-mancer-vant-s-16gb-3200',
      'storageId': 'ssd-kingston-nv3-500gb'
    },
    'targetBudgetRange': {
      'min': 4500,
      'max': 6000
    },
    'expectedPerformanceLevel': 'good',
    'recommendedFor': [
      'Custo-benefício',
      'Jogos em 1080p',
      'Uso misto'
    ],
    'limitations': [
      'Pode exigir upgrade de RAM para multitarefa pesada.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.',
      'Memória de módulo único CL19; não equivale a um kit de dois módulos CL16.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  },
  {
    'id': 'ready-build-high-performance',
    'name': 'PC Alta Performance',
    'usageProfile': 'high-performance',
    'description': 'Seleção de hardware para este perfil; estimativa de desempenho indisponível para a GPU revisada.',
    'components': {
      'cpuId': 'cpu-ryzen-7-7700',
      'gpuId': 'gpu-xfx-rx-9070-xt-swift-white-16g',
      'motherboardId': 'mb-gigabyte-b650m-d3hp',
      'ramId': 'ram-kf556c36bweak2-32',
      'storageId': 'ssd-kingston-nv3-2tb',
      'psuId': 'psu-msi-mag-a850gl-pcie5-white',
      'caseId': 'case-cooler-master-elite-502-white'
    },
    'targetBudgetRange': {
      'min': 10000,
      'max': 14000
    },
    'expectedPerformanceLevel': 'unavailable',
    'recommendedFor': [
      'Jogos pesados',
      '1440p alto',
      'Workloads exigentes'
    ],
    'limitations': [
      'Investimento alto para usuários iniciantes.',
      'Faixa-alvo original preservada; o preço atual pode excedê-la. Confira o total observado.',
      'Nova GPU sem calibração de pontuação/FPS; não herda a estimativa anterior.'
    ],
    'createdAt': '2026-05-22T12:00:00.000Z',
    'updatedAt': '2026-10-08'
  }
];
