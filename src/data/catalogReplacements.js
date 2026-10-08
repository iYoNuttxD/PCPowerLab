// Replacement models are new identities. Retired IDs remain resolvable for saved builds.
// Sources and purchase observations are dated; neither guarantees live stock.
export const replacementCatalog = [
  {
    'id': 'mb-gigabyte-b650m-d3hp',
    'name': 'Gigabyte B650M D3HP',
    'brand': 'Gigabyte',
    'category': 'motherboard',
    'partNumber': 'B650M D3HP',
    'price': null,
    'specSourceUrl': 'https://www.gigabyte.com/Motherboard/B650M-D3HP-rev-1x/sp',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'socket': 'AM5',
      'memoryType': 'DDR5',
      'formFactor': 'mATX',
      'chipset': 'B650',
      'storageInterfaces': [
        'M.2 NVMe',
        'SATA'
      ],
      'memorySlots': 4,
      'maxMemoryGb': 256,
      'sataPorts': 4,
      'm2Slots': 2,
      'cpuFanHeaders': 1,
      'systemFanHeaders': 2,
      'pcieGeneration': 4,
      'm2SupportedLengthsMm': [
        80,
        110
      ],
      'memorySupportNotes': 'Velocidade XMP/EXPO e capacidade por módulo dependem de CPU, BIOS e QVL.'
    },
    'selectionNotes': [
      'Mantém AM5, B650, DDR5 e formato mATX. O modelo Gigabyte tem limites próprios de memória, slots e conectores; confira BIOS e QVL.',
      'Placa-mãe não recebe ganho de FPS ou pontuação de processamento por esta troca.'
    ]
  },
  {
    'id': 'case-cooler-master-elite-502-white',
    'name': 'Cooler Master Elite 502 White',
    'brand': 'Cooler Master',
    'category': 'case',
    'partNumber': 'E502-WGNN-S00',
    'price': null,
    'specSourceUrl': 'https://www.coolermaster.com/en-us/products/elite-502.html',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'supportedFormFactors': [
        'ATX',
        'mATX',
        'ITX',
        'E-ATX'
      ],
      'maxGpuLengthMm': 360,
      'maxCoolerHeightMm': 170,
      'radiatorSizesMm': [
        120,
        140,
        240,
        280,
        360,
        420
      ],
      'fanMounts': [
        {
          'diameterMm': 120,
          'capacity': 7
        },
        {
          'diameterMm': 140,
          'capacity': 5
        }
      ],
      'includedFanCount': 3,
      'maxFanThicknessMm': null,
      'maxRadiatorThicknessMm': null,
      'coolingSupportNotes': 'Frente 3x120/140; topo 3x120 ou2x140; traseira1x120. Três120ARGB incluídos na frente. Frente até420mm limitado457x140x27mm; topo até360mm. GPU410mm somente sem radiador frontal; 360mm com montagem HDD indicada. E-ATX até305x277mm. Confirmar layout/folgas no manual.',
      'frontRadiatorMaxThicknessMm': 27,
      'maxGpuLengthWithHddBracketMm': 360,
      'includedFanDiameterMm': 120,
      'color': 'White',
      'maxGpuLengthWithoutFrontRadiatorMm': 410
    },
    'selectionNotes': [
      'O limite do cooler passa de 180 para 170 mm. O limite conservador de GPU é 360 mm; até 410 mm somente nas condições descritas pelo fabricante.',
      'Três fans de 120 mm incluídos; mudam posições, capacidade de ventoinhas e limites de radiador. A variante é branca.'
    ]
  },
  {
    'id': 'ram-kvr32n22d8-32',
    'name': 'Kingston ValueRAM 32GB (1x32GB) DDR4-3200 CL22',
    'brand': 'Kingston',
    'category': 'ram',
    'partNumber': 'KVR32N22D8/32',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/dataSheets/KVR32N22D8_32.pdf',
    'additionalSpecSourceUrls': [
      'https://www.kingston.com/en/memory/search?partid=KVR32N22D8%2F32'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'memoryType': 'DDR4',
      'capacityGb': 32,
      'speedMhz': 3200,
      'dataRateMTs': 3200,
      'modulesPerKit': 1,
      'capacityPerModuleGb': 32,
      'casLatency': 22,
      'voltageV': 1.2,
      'speedProfile': 'JEDEC DDR4-3200; no XMP needed for rated JEDEC profile',
      'dimensionsMm': {
        'length': 133.35,
        'height': 31.25,
        'thickness': null
      },
      'rgb': false
    },
    'selectionNotes': [
      'Mantém um módulo de 32 GB DDR4-3200 JEDEC. Confirme suporte a módulos de 32 GB nesta placa-mãe.',
      'Oferta de alto custo de vendedor parceiro; é referência datada, não recomendação de menor preço.'
    ]
  },
  {
    'id': 'ram-kf432c16bb12ak2-32',
    'name': 'Kingston FURY Beast RGB 32GB (2x16GB) DDR4-3200 CL16',
    'brand': 'Kingston',
    'category': 'ram',
    'partNumber': 'KF432C16BB12AK2/32',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/datasheets/KF432C16BB12AK2_32.pdf',
    'additionalSpecSourceUrls': [
      'https://www.kingston.com/en/memory/search?partid=KF432C16BB12AK2/32'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'memoryType': 'DDR4',
      'capacityGb': 32,
      'speedMhz': 3200,
      'dataRateMTs': 3200,
      'modulesPerKit': 2,
      'capacityPerModuleGb': 16,
      'casLatency': 16,
      'voltageV': 1.35,
      'speedProfile': 'Intel XMP 2.0',
      'dimensionsMm': {
        'length': 133.35,
        'height': 43,
        'thickness': 8.2
      },
      'rgb': true
    },
    'selectionNotes': [
      'Mantém kit de dois módulos, 32 GB DDR4-3200 CL16. A variante RGB tem 43 mm de altura; verificar folga do cooler.',
      'O perfil XMP e a revisão dos módulos mudam. Preço elevado entre as referências verificadas; não misturar kits presumindo equivalência.'
    ]
  },
  {
    'id': 'ram-kf432c16bb2ak2-64',
    'name': 'Kingston FURY Beast RGB 64GB (2x32GB) DDR4-3200 CL16',
    'brand': 'Kingston',
    'category': 'ram',
    'partNumber': 'KF432C16BB2AK2/64',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/datasheets/KF432C16BB2AK2_64.pdf',
    'additionalSpecSourceUrls': [
      'https://www.kingston.com/en/memory/search?partid=KF432C16BB2AK2/64'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'memoryType': 'DDR4',
      'capacityGb': 64,
      'speedMhz': 3200,
      'dataRateMTs': 3200,
      'modulesPerKit': 2,
      'capacityPerModuleGb': 32,
      'casLatency': 16,
      'voltageV': 1.35,
      'speedProfile': 'Intel XMP 2.0',
      'dimensionsMm': {
        'length': 133.35,
        'height': 43,
        'thickness': 8.2
      },
      'rgb': true
    },
    'selectionNotes': [
      'Mantém kit 2×32 GB DDR4-3200 CL16; a variante RGB tem 43 mm de altura. Confira folga do cooler e suporte por módulo.',
      'Preço elevado; disponibilidade datada não significa bom custo-benefício.'
    ]
  },
  {
    'id': 'ram-cmh32gx4m2z3600c18',
    'name': 'Corsair Vengeance RGB PRO SL 32GB (2x16GB) DDR4-3600 CL18 Black',
    'brand': 'Corsair',
    'category': 'ram',
    'partNumber': 'CMH32GX4M2Z3600C18',
    'price': null,
    'specSourceUrl': 'https://www.corsair.com/br/pt/p/memory/cmh32gx4m2z3600c18/vengeance-rgb-pro-sl-32gb-2x16gb-ddr4-dram-3600mhz-c18-memory-kit-a-black-cmh32gx4m2z3600c18',
    'additionalSpecSourceUrls': [
      'https://help.corsair.com/hc/en-us/articles/34381966388881-RAM-Memory-Module-Dimensions'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'memoryType': 'DDR4',
      'capacityGb': 32,
      'speedMhz': 3600,
      'dataRateMTs': 3600,
      'modulesPerKit': 2,
      'capacityPerModuleGb': 16,
      'casLatency': 18,
      'voltageV': 1.35,
      'speedProfile': 'Intel XMP 2.0',
      'dimensionsMm': {
        'length': 138.3,
        'height': 44.8,
        'thickness': 7.5
      },
      'rgb': true
    },
    'selectionNotes': [
      'Mantém 2×16 GB DDR4-3600 CL18; muda para Corsair RGB PRO SL, com 44,8 mm de altura.',
      'Velocidade anunciada requer XMP e plataforma compatível. Preço elevado; confira alternativas antes de comprar.'
    ]
  },
  {
    'id': 'ram-cmh64gx5m2b6000z30w',
    'name': 'Corsair Vengeance RGB 64GB (2x32GB) DDR5-6000 CL30 White',
    'brand': 'Corsair',
    'category': 'ram',
    'partNumber': 'CMH64GX5M2B6000Z30W',
    'price': null,
    'specSourceUrl': 'https://www.corsair.com/ww/en/p/memory/cmh64gx5m2b6000z30w/vengeance-rgb-64gb-2x32gb-ddr5-dram-6000mts-cl30-amd-expo-intel-xmp-memory-kit-white-cmh64gx5m2b6000z30w',
    'additionalSpecSourceUrls': [
      'https://help.corsair.com/hc/en-us/articles/34381966388881-RAM-Memory-Module-Dimensions'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'memoryType': 'DDR5',
      'capacityGb': 64,
      'speedMhz': 6000,
      'dataRateMTs': 6000,
      'modulesPerKit': 2,
      'capacityPerModuleGb': 32,
      'casLatency': 30,
      'voltageV': 1.4,
      'speedProfile': 'AMD EXPO & Intel XMP',
      'dimensionsMm': {
        'length': 135,
        'height': 44,
        'thickness': 8
      },
      'rgb': true
    },
    'selectionNotes': [
      'Mantém 2×32 GB DDR5-6000, mas muda para CL30, 1,4 V, RGB branco e perfil EXPO/XMP. Conferir BIOS, QVL e folga do cooler.',
      'Referência de custo excepcionalmente alto: R$ 10.799,99 no PIX. Alternativa disponível na consulta, sem indicação de bom custo-benefício ou preço normal de mercado.'
    ]
  },
  {
    'id': 'cooler-bequiet-pure-rock-3-black',
    'name': 'be quiet! Pure Rock 3 Black',
    'brand': 'be quiet!',
    'category': 'cooler',
    'partNumber': 'BK039',
    'price': null,
    'specSourceUrl': 'https://www.bequiet.com/en/cpucooler/5591',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'coolingType': 'air',
      'supportedSockets': [
        'AM4',
        'AM5',
        'LGA1851',
        'LGA1700',
        'LGA1200',
        'LGA1150',
        'LGA1151',
        'LGA1155'
      ],
      'heightMm': 154,
      'includedFanCount': 1,
      'powerWatts': 3.6,
      'powerBasis': 'Potência nominal informada ou derivada da ficha oficial; não é medição nem TDP térmico.',
      'connector': '4-pin PWM',
      'dimensionsMm': {
        'length': 71,
        'width': 124,
        'height': 154
      }
    },
    'selectionNotes': [
      'Muda para Pure Rock 3 Black, com 154 mm de altura e montagem própria. Conferir socket e espaço ao redor da RAM.',
      'Consumo elétrico de 3,6 W não é o TDP térmico de marketing. Não atribuímos ganho de FPS ao cooler.'
    ]
  },
  {
    'id': 'cooler-noctua-nh-l9a-am4-chromax-black',
    'name': 'Noctua NH-L9a-AM4 chromax.black',
    'brand': 'Noctua',
    'category': 'cooler',
    'partNumber': 'NH-L9A-AM4-CH.BK',
    'price': null,
    'specSourceUrl': 'https://cdn.noctua.at/media/noctua_nh_l9a_am4_chromax_black_infosheet_en_web.pdf?download=true',
    'additionalSpecSourceUrls': [
      'https://www.noctua.at/en/products/nh-l9a-am4-chromax-black/specifications'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'coolingType': 'air',
      'supportedSockets': [
        'AM4'
      ],
      'heightMm': 37,
      'includedFanCount': 1,
      'powerWatts': 2.52,
      'powerBasis': 'Potência nominal informada ou derivada da ficha oficial; não é medição nem TDP térmico.',
      'connector': '4-pin PWM',
      'dimensionsMm': {
        'height': 37,
        'width': 114,
        'length': 92
      }
    },
    'selectionNotes': [
      'Mantém perfil baixo de 37 mm e AM4, na variante chromax.black.',
      'O kit incluído não confirma suporte AM5; conferir lista de CPUs e interferências físicas.'
    ]
  },
  {
    'id': 'cooler-arctic-liquid-freezer-iii-pro-240-argb-white',
    'name': 'ARCTIC Liquid Freezer III Pro 240 A-RGB White',
    'brand': 'ARCTIC',
    'category': 'cooler',
    'partNumber': 'ACFRE00186A',
    'price': null,
    'specSourceUrl': 'https://www.arctic.de/en/Liquid-Freezer-III-Pro-240-A-RGB-White/ACFRE00186A',
    'additionalSpecSourceUrls': [
      'https://support.arctic.de/products/liquid-freezer-iii-pro-240-argb/techdocs/LF3%20Pro%20240%20ARGB%202D%20Drawing.pdf'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'coolingType': 'aio',
      'supportedSockets': [
        'AM4',
        'AM5',
        'LGA1700',
        'LGA1851'
      ],
      'heightMm': null,
      'includedFanCount': 2,
      'powerWatts': 18.72,
      'powerBasis': 'Potência nominal informada ou derivada da ficha oficial; não é medição nem TDP térmico.',
      'connector': '4-pin PWM',
      'radiatorSizeMm': 240,
      'radiatorThicknessMm': 38,
      'radiatorDimensionsMm': {
        'length': 277,
        'width': 120,
        'height': 38
      },
      'fanDiameterMm': 120,
      'fanThicknessMm': 25,
      'totalEnvelopeThicknessMm': 66,
      'compatibilityNotes': 'Conferir revisão, kit incluso, dissipadores M.2/VRM, RAM e folgas. Envelope conservador do conjunto: 66 mm; não apenas a espessura nominal do radiador.'
    },
    'selectionNotes': [
      'Mantém radiador de 240 mm, mas muda para Pro branco A-RGB. Requer conexões de iluminação apropriadas.',
      'O conjunto tem envelope conservador de 66 mm; confirmar folgas de RAM, GPU e dissipadores. Consumo nominal recalculado: 18,72 W.'
    ]
  },
  {
    'id': 'cooler-arctic-liquid-freezer-iii-pro-360',
    'name': 'ARCTIC Liquid Freezer III Pro 360 Black',
    'brand': 'ARCTIC',
    'category': 'cooler',
    'partNumber': 'ACFRE00180A',
    'price': null,
    'specSourceUrl': 'https://www.arctic.de/Liquid-Freezer-III-Pro-360',
    'additionalSpecSourceUrls': [
      'https://www.arctic.de/media/e6/06/4a/1741780098/Spec_Sheet_Liquid_Freezer_III_Pro_360_DE.pdf'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'coolingType': 'aio',
      'supportedSockets': [
        'AM4',
        'AM5',
        'LGA1700',
        'LGA1851'
      ],
      'heightMm': null,
      'includedFanCount': 3,
      'powerWatts': 16.68,
      'powerBasis': 'Potência nominal informada ou derivada da ficha oficial; não é medição nem TDP térmico.',
      'connector': '4-pin PWM',
      'radiatorSizeMm': 360,
      'radiatorThicknessMm': 38,
      'radiatorDimensionsMm': {
        'length': 398,
        'width': 120,
        'height': 38
      },
      'fanDiameterMm': 120,
      'fanThicknessMm': 25,
      'totalEnvelopeThicknessMm': 66,
      'compatibilityNotes': 'Conferir revisão, kit incluso, dissipadores M.2/VRM, RAM e folgas. Envelope conservador do conjunto: 66 mm; não apenas a espessura nominal do radiador.'
    },
    'selectionNotes': [
      'Mantém radiador de 360 mm preto, agora com fans P12 Pro. Curva de rotação, ruído e consumo mudam.',
      'Envelope conservador de 66 mm; compatibilidade física detalhada continua sujeita ao manual. Não há ganho de FPS presumido.'
    ]
  },
  {
    'id': 'fan-arctic-p12-pro',
    'name': 'ARCTIC P12 Pro (1 fan)',
    'brand': 'ARCTIC',
    'category': 'fan',
    'partNumber': 'ACFAN00305A',
    'price': null,
    'specSourceUrl': 'https://www.arctic.de/en/P12-Pro/ACFAN00305A',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'diameterMm': 120,
      'thicknessMm': 25,
      'unitsPerPack': 1,
      'connector': '4-pin PWM',
      'powerWatts': 3.96,
      'powerBasis': 'Potência nominal por unidade, incluindo LEDs quando especificados; derivada dos dados oficiais, não é medição.',
      'auxiliaryPowerUnknown': false,
      'auxiliaryPowerNotes': null,
      'rgb': false
    },
    'selectionNotes': [
      'Mantém 120×120×25 mm e PWM, mas muda para ARCTIC P12 Pro de até 3.000 rpm.',
      'Consumo nominal por fan de 3,96 W; pressão, ruído e curva de rotação não são equivalentes ao Noctua.'
    ]
  },
  {
    'id': 'fan-arctic-p12-pro-pst-white',
    'name': 'ARCTIC P12 Pro PST White (1 fan)',
    'brand': 'ARCTIC',
    'category': 'fan',
    'partNumber': 'ACFAN00308A',
    'price': null,
    'specSourceUrl': 'https://www.arctic.de/en/P12-Pro-PST-White/ACFAN00308A',
    'additionalSpecSourceUrls': [
      'https://www.arctic.de/media/2c/de/c6/1750758983/Spec_Sheet_P12_Pro_PST_EN.pdf'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'diameterMm': 120,
      'thicknessMm': 25,
      'unitsPerPack': 1,
      'connector': '4-pin PWM plug + 4-pin socket (PST)',
      'powerWatts': 3.96,
      'powerBasis': 'Potência nominal por unidade, incluindo LEDs quando especificados; derivada dos dados oficiais, não é medição.',
      'auxiliaryPowerUnknown': false,
      'auxiliaryPowerNotes': null,
      'rgb': false
    },
    'selectionNotes': [
      'Mantém uma unidade de 120×120×25 mm, PWM e conexão em cadeia PST, agora na variante Pro branca.',
      'Corrente nominal de 0,33 A por fan: conferir limite dos conectores e divisores.'
    ]
  },
  {
    'id': 'fan-coolermaster-sickleflow-edge-120-argb-white-3-pack',
    'name': 'Cooler Master SickleFlow Edge 120 A-RGB White (kit 3 fans)',
    'brand': 'Cooler Master',
    'category': 'fan',
    'partNumber': 'MFX-B2DW-253P2-R2',
    'price': null,
    'specSourceUrl': 'https://www.coolermaster.com/en-in/products/sickleflow-edge-120-argb-3-pack-white-edition.html',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'diameterMm': 120,
      'thicknessMm': 25,
      'unitsPerPack': 3,
      'connector': '4-pin PWM',
      'powerWatts': 3.45,
      'powerBasis': 'Potência nominal por unidade, incluindo LEDs quando especificados; derivada dos dados oficiais, não é medição.',
      'auxiliaryPowerUnknown': true,
      'auxiliaryPowerNotes': 'Consumo próprio da controladora não especificado; não incluído.',
      'rgb': true
    },
    'selectionNotes': [
      'O novo produto é um kit real de TRÊS fans; o anterior tinha CINCO. O preço exibido é pelo kit de três.',
      'Muda para Cooler Master branco A-RGB. Três fans somam 10,35 W nominais; o consumo próprio da controladora não foi informado.'
    ]
  },
  {
    'id': 'ssd-kingston-nv3-500gb',
    'name': 'Kingston NV3 500GB',
    'brand': 'Kingston',
    'category': 'storage',
    'partNumber': 'SNV3S/500G',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/en/ssd/nv3-nvme-pcie-ssd',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'interface': 'M.2 NVMe',
      'storageType': 'SSD',
      'capacityGb': 500,
      'readSpeedMbS': 5000,
      'writeSpeedMbS': 3000,
      'formFactor': 'M.2 2280 single-sided',
      'enduranceTBW': 160,
      'm2LengthMm': 80
    },
    'selectionNotes': [
      'A capacidade passa de 250 para 500 GB. O NV3 usa M.2 2280 NVMe PCIe 4.0; a velocidade efetiva depende do slot.',
      'Os índices são recalculados a partir das especificações do novo SSD; não são benchmarks medidos.'
    ]
  },
  {
    'id': 'ssd-xpg-gammix-s70-blade-1tb',
    'name': 'XPG GAMMIX S70 BLADE 1TB',
    'brand': 'XPG',
    'category': 'storage',
    'partNumber': 'AGAMMIXS70B-1T-CS',
    'price': null,
    'specSourceUrl': 'https://webapi3.adata.com/storage/downloadfile/datasheet_xpg_gammix_s70_blade_pcie_gen4_x4_m2_ssd_20250630.pdf',
    'additionalSpecSourceUrls': [
      'https://www.xpg.com/us/xpg/830?tab=description'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'interface': 'M.2 NVMe',
      'storageType': 'SSD',
      'capacityGb': 1024,
      'readSpeedMbS': 7400,
      'writeSpeedMbS': 5500,
      'formFactor': 'M.2 2280',
      'enduranceTBW': 740,
      'm2LengthMm': 80
    },
    'selectionNotes': [
      'Mantém a classe de capacidade 1 TB em M.2 2280, mudando para XPG S70 BLADE PCIe 4.0 com DRAM.',
      'Em slot PCIe 3.0, não atinge a taxa máxima declarada para PCIe 4.0. Conferir espaço do dissipador.',
      'Mantém a classe de capacidade 1 TB, M.2 2280 e PCIe 4.0; muda para XPG S70 BLADE com especificações próprias.',
      'O mesmo SKU atende às duas referências antigas de 1 TB e aparece uma única vez no catálogo ativo.'
    ]
  },
  {
    'id': 'ssd-kingston-nv3-2tb',
    'name': 'Kingston NV3 2TB',
    'brand': 'Kingston',
    'category': 'storage',
    'partNumber': 'SNV3S/2000G',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/en/memory/search?partId=SNV3S/2000G',
    'additionalSpecSourceUrls': [
      'https://www.kingston.com/en/ssd/nv3-nvme-pcie-ssd'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'interface': 'M.2 NVMe',
      'storageType': 'SSD',
      'capacityGb': 2000,
      'readSpeedMbS': 6000,
      'writeSpeedMbS': 5000,
      'formFactor': 'M.2 2280 single-sided',
      'enduranceTBW': 640,
      'm2LengthMm': 80
    },
    'selectionNotes': [
      'O NV3 mantém 2 TB, mas é uma alternativa de classe inferior ao 980 PRO: leitura declarada de até 6.000 MB/s e durabilidade de 640 TBW.',
      'Não é apresentado como upgrade ou desempenho equivalente. Pontuação, preço e compatibilidade são recalculados.'
    ]
  },
  {
    'id': 'ssd-sandisk-520-2tb',
    'name': 'SanDisk 520 SATA SSD 2TB',
    'brand': 'SanDisk',
    'category': 'storage',
    'partNumber': 'SDSS51200TAB-000G0',
    'price': null,
    'specSourceUrl': 'https://www.sandisk.com/products/ssd/internal-ssd/sandisk-520-sata-ssd',
    'additionalSpecSourceUrls': [
      'https://support-en.sandisk.com/app/answers/detailweb/a_id/49386'
    ],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'interface': 'SATA',
      'storageType': 'SSD',
      'capacityGb': 2000,
      'readSpeedMbS': 560,
      'writeSpeedMbS': 520,
      'formFactor': '2.5-inch 7mm',
      'enduranceTBW': 700
    },
    'selectionNotes': [
      'Mantém 2 TB, SATA e formato de 2,5 polegadas; mudam fabricante, velocidades e durabilidade declaradas.',
      'O SanDisk 520 tem referência de preço alta e especificações próprias; não reaproveita a pontuação arbitrária do modelo antigo.'
    ]
  },
  {
    'id': 'ssd-kingston-nv3-4tb',
    'name': 'Kingston NV3 4TB',
    'brand': 'Kingston',
    'category': 'storage',
    'partNumber': 'SNV3S/4000G',
    'price': null,
    'specSourceUrl': 'https://www.kingston.com/en/ssd/nv3-nvme-pcie-ssd',
    'additionalSpecSourceUrls': [],
    'specVerifiedAt': '2026-10-08',
    'catalogRevision': '2026-10-08-replacements',
    'active': true,
    'specs': {
      'interface': 'M.2 NVMe',
      'storageType': 'SSD',
      'capacityGb': 4000,
      'readSpeedMbS': 6000,
      'writeSpeedMbS': 5000,
      'formFactor': 'M.2 2280 single-sided',
      'enduranceTBW': 1280,
      'm2LengthMm': 80
    },
    'selectionNotes': [
      'Mudança de interface: SATA de 2,5 polegadas para M.2 2280 NVMe, preservando 4 TB.',
      'Exige slot M.2 NVMe compatível. Não funciona apenas ligando ao cabo SATA; a configuração precisa ser verificada antes de aplicar.'
    ]
  }
];
export const replacementMapping = {
  'mb-asus-prime-b650m-a': 'mb-gigabyte-b650m-d3hp',
  'case-montech-air-903-base': 'case-cooler-master-elite-502-white',
  'ram-crucial-32gb-ddr4-3200': 'ram-kvr32n22d8-32',
  'ram-kf432c16bbk2-32': 'ram-kf432c16bb12ak2-32',
  'ram-kf432c16bbk2-64': 'ram-kf432c16bb2ak2-64',
  'ram-kf436c18bbk2-32': 'ram-cmh32gx4m2z3600c18',
  'ram-cmk64gx5m2b6000c40': 'ram-cmh64gx5m2b6000z30w',
  'cooler-noctua-nh-u12s-redux': 'cooler-bequiet-pure-rock-3-black',
  'cooler-noctua-nh-l9a-am4': 'cooler-noctua-nh-l9a-am4-chromax-black',
  'cooler-arctic-liquid-freezer-iii-240': 'cooler-arctic-liquid-freezer-iii-pro-240-argb-white',
  'cooler-arctic-liquid-freezer-iii-360': 'cooler-arctic-liquid-freezer-iii-pro-360',
  'fan-noctua-nf-p12-redux-1700-pwm': 'fan-arctic-p12-pro',
  'fan-arctic-p12-pwm-pst': 'fan-arctic-p12-pro-pst-white',
  'fan-arctic-p12-pwm-pst-5-pack': 'fan-coolermaster-sickleflow-edge-120-argb-white-3-pack',
  'ssd-samsung-970-evo-plus-250gb': 'ssd-kingston-nv3-500gb',
  'ssd-samsung-970-evo-plus-1tb': 'ssd-xpg-gammix-s70-blade-1tb',
  'ssd-samsung-980-pro-1tb': 'ssd-xpg-gammix-s70-blade-1tb',
  'ssd-samsung-980-pro-2tb': 'ssd-kingston-nv3-2tb',
  'ssd-samsung-870-evo-2000gb': 'ssd-sandisk-520-2tb',
  'ssd-samsung-870-evo-4000gb': 'ssd-kingston-nv3-4tb'
};
export const replacementNotes = {
  'mb-asus-prime-b650m-a': [
    'Mantém AM5, B650, DDR5 e formato mATX. O modelo Gigabyte tem limites próprios de memória, slots e conectores; confira BIOS e QVL.',
    'Placa-mãe não recebe ganho de FPS ou pontuação de processamento por esta troca.'
  ],
  'case-montech-air-903-base': [
    'O limite do cooler passa de 180 para 170 mm. O limite conservador de GPU é 360 mm; até 410 mm somente nas condições descritas pelo fabricante.',
    'Três fans de 120 mm incluídos; mudam posições, capacidade de ventoinhas e limites de radiador. A variante é branca.'
  ],
  'ram-crucial-32gb-ddr4-3200': [
    'Mantém um módulo de 32 GB DDR4-3200 JEDEC. Confirme suporte a módulos de 32 GB nesta placa-mãe.',
    'Oferta de alto custo de vendedor parceiro; é referência datada, não recomendação de menor preço.'
  ],
  'ram-kf432c16bbk2-32': [
    'Mantém kit de dois módulos, 32 GB DDR4-3200 CL16. A variante RGB tem 43 mm de altura; verificar folga do cooler.',
    'O perfil XMP e a revisão dos módulos mudam. Preço elevado entre as referências verificadas; não misturar kits presumindo equivalência.'
  ],
  'ram-kf432c16bbk2-64': [
    'Mantém kit 2×32 GB DDR4-3200 CL16; a variante RGB tem 43 mm de altura. Confira folga do cooler e suporte por módulo.',
    'Preço elevado; disponibilidade datada não significa bom custo-benefício.'
  ],
  'ram-kf436c18bbk2-32': [
    'Mantém 2×16 GB DDR4-3600 CL18; muda para Corsair RGB PRO SL, com 44,8 mm de altura.',
    'Velocidade anunciada requer XMP e plataforma compatível. Preço elevado; confira alternativas antes de comprar.'
  ],
  'ram-cmk64gx5m2b6000c40': [
    'Mantém 2×32 GB DDR5-6000, mas muda para CL30, 1,4 V, RGB branco e perfil EXPO/XMP. Conferir BIOS, QVL e folga do cooler.',
    'Referência de custo excepcionalmente alto: R$ 10.799,99 no PIX. Alternativa disponível na consulta, sem indicação de bom custo-benefício ou preço normal de mercado.'
  ],
  'ssd-samsung-970-evo-plus-250gb': [
    'A capacidade passa de 250 para 500 GB. O NV3 usa M.2 2280 NVMe PCIe 4.0; a velocidade efetiva depende do slot.',
    'Os índices são recalculados a partir das especificações do novo SSD; não são benchmarks medidos.'
  ],
  'ssd-samsung-970-evo-plus-1tb': [
    'Mantém a classe de capacidade 1 TB em M.2 2280, mudando para XPG S70 BLADE PCIe 4.0 com DRAM.',
    'Em slot PCIe 3.0, não atinge a taxa máxima declarada para PCIe 4.0. Conferir espaço do dissipador.'
  ],
  'ssd-samsung-980-pro-1tb': [
    'Mantém a classe de capacidade 1 TB, M.2 2280 e PCIe 4.0; muda para XPG S70 BLADE com especificações próprias.',
    'O mesmo SKU atende às duas referências antigas de 1 TB e aparece uma única vez no catálogo ativo.'
  ],
  'ssd-samsung-980-pro-2tb': [
    'O NV3 mantém 2 TB, mas é uma alternativa de classe inferior ao 980 PRO: leitura declarada de até 6.000 MB/s e durabilidade de 640 TBW.',
    'Não é apresentado como upgrade ou desempenho equivalente. Pontuação, preço e compatibilidade são recalculados.'
  ],
  'ssd-samsung-870-evo-2000gb': [
    'Mantém 2 TB, SATA e formato de 2,5 polegadas; mudam fabricante, velocidades e durabilidade declaradas.',
    'O SanDisk 520 tem referência de preço alta e especificações próprias; não reaproveita a pontuação arbitrária do modelo antigo.'
  ],
  'ssd-samsung-870-evo-4000gb': [
    'Mudança de interface: SATA de 2,5 polegadas para M.2 2280 NVMe, preservando 4 TB.',
    'Exige slot M.2 NVMe compatível. Não funciona apenas ligando ao cabo SATA; a configuração precisa ser verificada antes de aplicar.'
  ],
  'cooler-noctua-nh-u12s-redux': [
    'Muda para Pure Rock 3 Black, com 154 mm de altura e montagem própria. Conferir socket e espaço ao redor da RAM.',
    'Consumo elétrico de 3,6 W não é o TDP térmico de marketing. Não atribuímos ganho de FPS ao cooler.'
  ],
  'cooler-noctua-nh-l9a-am4': [
    'Mantém perfil baixo de 37 mm e AM4, na variante chromax.black.',
    'O kit incluído não confirma suporte AM5; conferir lista de CPUs e interferências físicas.'
  ],
  'cooler-arctic-liquid-freezer-iii-240': [
    'Mantém radiador de 240 mm, mas muda para Pro branco A-RGB. Requer conexões de iluminação apropriadas.',
    'O conjunto tem envelope conservador de 66 mm; confirmar folgas de RAM, GPU e dissipadores. Consumo nominal recalculado: 18,72 W.'
  ],
  'cooler-arctic-liquid-freezer-iii-360': [
    'Mantém radiador de 360 mm preto, agora com fans P12 Pro. Curva de rotação, ruído e consumo mudam.',
    'Envelope conservador de 66 mm; compatibilidade física detalhada continua sujeita ao manual. Não há ganho de FPS presumido.'
  ],
  'fan-noctua-nf-p12-redux-1700-pwm': [
    'Mantém 120×120×25 mm e PWM, mas muda para ARCTIC P12 Pro de até 3.000 rpm.',
    'Consumo nominal por fan de 3,96 W; pressão, ruído e curva de rotação não são equivalentes ao Noctua.'
  ],
  'fan-arctic-p12-pwm-pst': [
    'Mantém uma unidade de 120×120×25 mm, PWM e conexão em cadeia PST, agora na variante Pro branca.',
    'Corrente nominal de 0,33 A por fan: conferir limite dos conectores e divisores.'
  ],
  'fan-arctic-p12-pwm-pst-5-pack': [
    'O novo produto é um kit real de TRÊS fans; o anterior tinha CINCO. O preço exibido é pelo kit de três.',
    'Muda para Cooler Master branco A-RGB. Três fans somam 10,35 W nominais; o consumo próprio da controladora não foi informado.'
  ]
};

export function attachCatalogLifecycle(component) {
  if (!Object.hasOwn(replacementMapping, component.id)) return component;
  return { ...component, active: false, lifecycle: 'legacy',
    replacementId: replacementMapping[component.id],
    replacementNotes: replacementNotes[component.id] || [],
    lifecycleReason: 'Modelo retirado da seleção nova; identidade preservada nas configurações existentes.',
    retiredAt: '2026-10-08' };
}
