import { replacementCatalog } from './catalogReplacements.js';
import { marketRevalidationCatalog } from './market-revalidation-catalog.js';
import { catalogV21 } from './catalog.v21.js';

export const performanceParameters = [
  {
    componentId: 'cpu-ryzen-5-5500',
    type: 'cpu',
    performanceScore: 62,
    cores: 6,
    threads: 12,
    baseClock: 3.6,
    boostClock: 4.2,
    generation: 'Zen 3',
    tdp: 65,
    recommendedUse: ['general', 'study', 'gaming'],
    gamingScore: 60,
    productivityScore: 58
  },
  {
    componentId: 'cpu-ryzen-5-5600',
    type: 'cpu',
    performanceScore: 70,
    cores: 6,
    threads: 12,
    baseClock: 3.5,
    boostClock: 4.4,
    generation: 'Zen 3',
    tdp: 65,
    recommendedUse: ['gaming', 'general', 'programming'],
    gamingScore: 72,
    productivityScore: 68
  },
  {
    componentId: 'cpu-ryzen-7-5700x',
    type: 'cpu',
    performanceScore: 78,
    cores: 8,
    threads: 16,
    baseClock: 3.4,
    boostClock: 4.6,
    generation: 'Zen 3',
    tdp: 65,
    recommendedUse: ['gaming', 'programming', 'work'],
    gamingScore: 76,
    productivityScore: 82
  },
  {
    componentId: 'cpu-ryzen-7-5800x3d',
    type: 'cpu',
    performanceScore: 84,
    cores: 8,
    threads: 16,
    baseClock: 3.4,
    boostClock: 4.5,
    generation: 'Zen 3 3D V-Cache',
    tdp: 105,
    recommendedUse: ['gaming', 'streaming', 'upgrade'],
    gamingScore: 92,
    productivityScore: 76
  },
  {
    componentId: 'cpu-ryzen-5-7600',
    type: 'cpu',
    performanceScore: 82,
    cores: 6,
    threads: 12,
    baseClock: 3.8,
    boostClock: 5.1,
    generation: 'Zen 4',
    tdp: 65,
    recommendedUse: ['gaming', 'general', 'upgrade'],
    gamingScore: 86,
    productivityScore: 78
  },
  {
    componentId: 'cpu-ryzen-7-7700',
    type: 'cpu',
    performanceScore: 88,
    cores: 8,
    threads: 16,
    baseClock: 3.8,
    boostClock: 5.3,
    generation: 'Zen 4',
    tdp: 65,
    recommendedUse: ['gaming', 'video-editing', 'programming'],
    gamingScore: 87,
    productivityScore: 90
  },
  {
    componentId: 'cpu-intel-i3-12100f',
    type: 'cpu',
    performanceScore: 55,
    cores: 4,
    threads: 8,
    baseClock: 3.3,
    boostClock: 4.3,
    generation: 'Alder Lake',
    tdp: 58,
    recommendedUse: ['study', 'general', 'gaming'],
    gamingScore: 58,
    productivityScore: 48
  },
  {
    componentId: 'cpu-intel-i5-12400f',
    type: 'cpu',
    performanceScore: 72,
    cores: 6,
    threads: 12,
    baseClock: 2.5,
    boostClock: 4.4,
    generation: 'Alder Lake',
    tdp: 65,
    recommendedUse: ['gaming', 'general', 'programming'],
    gamingScore: 74,
    productivityScore: 70
  },
  {
    componentId: 'cpu-intel-i5-13400f',
    type: 'cpu',
    performanceScore: 78,
    cores: 10,
    threads: 16,
    baseClock: 2.5,
    boostClock: 4.6,
    generation: 'Raptor Lake',
    tdp: 65,
    recommendedUse: ['gaming', 'programming', 'streaming'],
    gamingScore: 78,
    productivityScore: 80
  },
  {
    componentId: 'cpu-intel-i5-13600k',
    type: 'cpu',
    performanceScore: 90,
    cores: 14,
    threads: 20,
    baseClock: 3.5,
    boostClock: 5.1,
    generation: 'Raptor Lake',
    tdp: 125,
    recommendedUse: ['gaming', 'video-editing', 'streaming'],
    gamingScore: 88,
    productivityScore: 92
  },
  {
    componentId: 'cpu-intel-i7-13700k',
    type: 'cpu',
    performanceScore: 95,
    cores: 16,
    threads: 24,
    baseClock: 3.4,
    boostClock: 5.4,
    generation: 'Raptor Lake',
    tdp: 125,
    recommendedUse: ['gaming', 'video-editing', 'work'],
    gamingScore: 92,
    productivityScore: 97
  },
  {
    componentId: 'cpu-intel-i5-14400f',
    type: 'cpu',
    performanceScore: 80,
    cores: 10,
    threads: 16,
    baseClock: 2.5,
    boostClock: 4.7,
    generation: 'Raptor Lake Refresh',
    tdp: 65,
    recommendedUse: ['gaming', 'general', 'programming'],
    gamingScore: 80,
    productivityScore: 82
  },
  {
    componentId: 'gpu-gtx-1650',
    type: 'gpu',
    performanceScore: 38,
    gamingScore: 40,
    productivityScore: 32,
    vram: 4,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p low',
    rayTracingSupport: false,
    tdp: 75,
    recommendedUse: ['general', 'study']
  },
  {
    componentId: 'gpu-rtx-3050',
    type: 'gpu',
    performanceScore: 52,
    gamingScore: 55,
    productivityScore: 48,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: true,
    tdp: 130,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'gpu-rtx-3060',
    type: 'gpu',
    performanceScore: 65,
    gamingScore: 68,
    productivityScore: 60,
    vram: 12,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: true,
    tdp: 170,
    recommendedUse: ['gaming', 'design', 'streaming']
  },
  {
    componentId: 'gpu-rtx-4060',
    type: 'gpu',
    performanceScore: 76,
    gamingScore: 80,
    productivityScore: 65,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: true,
    tdp: 115,
    recommendedUse: ['gaming', 'general', 'streaming']
  },
  {
    componentId: 'gpu-rtx-4060-ti',
    type: 'gpu',
    performanceScore: 82,
    gamingScore: 85,
    productivityScore: 72,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p ultra',
    rayTracingSupport: true,
    tdp: 160,
    recommendedUse: ['gaming', 'streaming', 'design']
  },
  {
    componentId: 'gpu-rtx-4070',
    type: 'gpu',
    performanceScore: 90,
    gamingScore: 92,
    productivityScore: 82,
    vram: 12,
    memoryType: 'GDDR6X',
    recommendedResolution: '1440p',
    rayTracingSupport: true,
    tdp: 200,
    recommendedUse: ['gaming', 'video-editing', 'design']
  },
  {
    componentId: 'gpu-rtx-4070-super',
    type: 'gpu',
    performanceScore: 94,
    gamingScore: 95,
    productivityScore: 86,
    vram: 12,
    memoryType: 'GDDR6X',
    recommendedResolution: '1440p ultra',
    rayTracingSupport: true,
    tdp: 220,
    recommendedUse: ['gaming', 'video-editing', 'streaming']
  },
  {
    componentId: 'gpu-rx-6600',
    type: 'gpu',
    performanceScore: 60,
    gamingScore: 64,
    productivityScore: 52,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: false,
    tdp: 132,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'gpu-rx-7600',
    type: 'gpu',
    performanceScore: 72,
    gamingScore: 76,
    productivityScore: 58,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: true,
    tdp: 165,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'gpu-rx-7700-xt',
    type: 'gpu',
    performanceScore: 86,
    gamingScore: 88,
    productivityScore: 76,
    vram: 12,
    memoryType: 'GDDR6',
    recommendedResolution: '1440p',
    rayTracingSupport: true,
    tdp: 245,
    recommendedUse: ['gaming', 'video-editing', 'design']
  },
  {
    componentId: 'gpu-rx-7800-xt',
    type: 'gpu',
    performanceScore: 92,
    gamingScore: 93,
    productivityScore: 82,
    vram: 16,
    memoryType: 'GDDR6',
    recommendedResolution: '1440p ultra',
    rayTracingSupport: true,
    tdp: 263,
    recommendedUse: ['gaming', 'video-editing', 'streaming']
  },
  {
    componentId: 'ram-kingston-fury-8gb-ddr4',
    type: 'ram',
    capacity: 8,
    speed: 3200,
    memoryType: 'DDR4',
    performanceScore: 35,
    gamingScore: 38,
    productivityScore: 34,
    recommendedUse: ['study', 'general']
  },
  {
    componentId: 'ram-kingston-fury-16gb-ddr4',
    type: 'ram',
    capacity: 16,
    speed: 3200,
    memoryType: 'DDR4',
    performanceScore: 60,
    gamingScore: 62,
    productivityScore: 60,
    recommendedUse: ['gaming', 'general', 'programming']
  },
  {
    componentId: 'ram-kingston-fury-32gb-ddr4',
    type: 'ram',
    capacity: 32,
    speed: 3200,
    memoryType: 'DDR4',
    performanceScore: 72,
    gamingScore: 70,
    productivityScore: 78,
    recommendedUse: ['programming', 'video-editing', 'work']
  },
  {
    componentId: 'ram-corsair-vengeance-16gb-ddr4-3600',
    type: 'ram',
    capacity: 16,
    speed: 3600,
    memoryType: 'DDR4',
    performanceScore: 64,
    gamingScore: 66,
    productivityScore: 62,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'ram-corsair-vengeance-16gb-ddr5',
    type: 'ram',
    capacity: 16,
    speed: 5200,
    memoryType: 'DDR5',
    performanceScore: 70,
    gamingScore: 72,
    productivityScore: 70,
    recommendedUse: ['gaming', 'general', 'productivity']
  },
  {
    componentId: 'ram-corsair-vengeance-32gb-ddr5-5600',
    type: 'ram',
    capacity: 32,
    speed: 5600,
    memoryType: 'DDR5',
    performanceScore: 85,
    gamingScore: 84,
    productivityScore: 88,
    recommendedUse: ['gaming', 'video-editing', 'programming']
  },
  {
    componentId: 'ram-kingston-fury-16gb-ddr5-6000',
    type: 'ram',
    capacity: 16,
    speed: 6000,
    memoryType: 'DDR5',
    performanceScore: 74,
    gamingScore: 76,
    productivityScore: 72,
    recommendedUse: ['gaming', 'general', 'upgrade']
  },
  {
    componentId: 'ram-gskill-trident-z5-32gb-ddr5-6000',
    type: 'ram',
    capacity: 32,
    speed: 6000,
    memoryType: 'DDR5',
    performanceScore: 88,
    gamingScore: 88,
    productivityScore: 90,
    recommendedUse: ['gaming', 'video-editing', 'streaming']
  },
  {
    componentId: 'ssd-kingston-a400-480gb',
    type: 'storage',
    capacity: 480,
    interface: 'SATA',
    readSpeed: 500,
    writeSpeed: 450,
    performanceScore: 45,
    gamingScore: 45,
    productivityScore: 42,
    recommendedUse: ['study', 'general']
  },
  {
    componentId: 'ssd-kingston-nv2-500gb',
    type: 'storage',
    capacity: 500,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 2100,
    performanceScore: 65,
    gamingScore: 66,
    productivityScore: 62,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'ssd-kingston-nv2-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 2100,
    performanceScore: 65,
    gamingScore: 66,
    productivityScore: 64,
    recommendedUse: ['gaming', 'general', 'productivity']
  },
  {
    componentId: 'ssd-wd-blue-sn570-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 3000,
    performanceScore: 70,
    gamingScore: 70,
    productivityScore: 72,
    recommendedUse: ['gaming', 'general', 'programming']
  },
  {
    componentId: 'ssd-wd-black-sn770-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 5150,
    writeSpeed: 4900,
    performanceScore: 78,
    gamingScore: 78,
    productivityScore: 80,
    recommendedUse: ['gaming', 'video-editing', 'programming']
  },
  {
    componentId: 'ssd-samsung-970-evo-plus-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 3300,
    performanceScore: 76,
    gamingScore: 74,
    productivityScore: 78,
    recommendedUse: ['gaming', 'work', 'programming']
  },
  {
    componentId: 'ssd-samsung-980-pro-2tb',
    type: 'storage',
    capacity: 2000,
    interface: 'M.2 NVMe',
    readSpeed: 7000,
    writeSpeed: 5100,
    performanceScore: 90,
    gamingScore: 88,
    productivityScore: 92,
    recommendedUse: ['gaming', 'video-editing', 'design']
  },
  {
    componentId: 'hdd-seagate-barracuda-2tb',
    type: 'storage',
    capacity: 2000,
    interface: 'SATA',
    readSpeed: 190,
    writeSpeed: 180,
    performanceScore: 25,
    gamingScore: 22,
    productivityScore: 24,
    recommendedUse: ['general']
  },
  {
    componentId: 'psu-generic-400w',
    type: 'psu',
    wattage: 400,
    efficiency: 'Nao informado',
    performanceScore: 42,
    recommendedUse: ['general']
  },
  {
    componentId: 'psu-corsair-cv550',
    type: 'psu',
    wattage: 550,
    efficiency: '80 Plus Bronze',
    performanceScore: 62,
    recommendedUse: ['general', 'gaming']
  },
  {
    componentId: 'psu-corsair-650w',
    type: 'psu',
    wattage: 650,
    efficiency: '80 Plus Bronze',
    performanceScore: 75,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'psu-cooler-master-mwe-650w',
    type: 'psu',
    wattage: 650,
    efficiency: '80 Plus Bronze',
    performanceScore: 74,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'psu-xpg-pylon-650w',
    type: 'psu',
    wattage: 650,
    efficiency: '80 Plus Bronze',
    performanceScore: 73,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'psu-corsair-rm750e',
    type: 'psu',
    wattage: 750,
    efficiency: '80 Plus Gold',
    performanceScore: 84,
    recommendedUse: ['gaming', 'upgrade', 'streaming']
  },
  {
    componentId: 'psu-xpg-core-reactor-850w',
    type: 'psu',
    wattage: 850,
    efficiency: '80 Plus Gold',
    performanceScore: 90,
    recommendedUse: ['gaming', 'video-editing', 'upgrade']
  },
  {
    componentId: 'psu-corsair-rm850x',
    type: 'psu',
    wattage: 850,
    efficiency: '80 Plus Gold',
    performanceScore: 92,
    recommendedUse: ['gaming', 'work', 'upgrade']
  },
  {
    componentId: 'mb-b550m-aorus-elite',
    type: 'motherboard',
    chipset: 'B550',
    socket: 'AM4',
    memoryType: 'DDR4',
    formFactor: 'mATX',
    performanceScore: 74,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-asus-tuf-b550m-plus',
    type: 'motherboard',
    chipset: 'B550',
    socket: 'AM4',
    memoryType: 'DDR4',
    formFactor: 'mATX',
    performanceScore: 78,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-msi-b550-tomahawk',
    type: 'motherboard',
    chipset: 'B550',
    socket: 'AM4',
    memoryType: 'DDR4',
    formFactor: 'ATX',
    performanceScore: 82,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-asus-prime-b650m-a',
    type: 'motherboard',
    chipset: 'B650',
    socket: 'AM5',
    memoryType: 'DDR5',
    formFactor: 'mATX',
    performanceScore: 82,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-gigabyte-b650-gaming-x-ax',
    type: 'motherboard',
    chipset: 'B650',
    socket: 'AM5',
    memoryType: 'DDR5',
    formFactor: 'ATX',
    performanceScore: 86,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe', 'Wi-Fi']
  },
  {
    componentId: 'mb-h610m-ddr4',
    type: 'motherboard',
    chipset: 'H610',
    socket: 'LGA1700',
    memoryType: 'DDR4',
    formFactor: 'mATX',
    performanceScore: 68,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-msi-pro-b660m-a-ddr4',
    type: 'motherboard',
    chipset: 'B660',
    socket: 'LGA1700',
    memoryType: 'DDR4',
    formFactor: 'mATX',
    performanceScore: 76,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-gigabyte-b760m-ds3h-ddr4',
    type: 'motherboard',
    chipset: 'B760',
    socket: 'LGA1700',
    memoryType: 'DDR4',
    formFactor: 'mATX',
    performanceScore: 78,
    expansionSupport: ['PCIe 4.0', 'M.2 NVMe']
  },
  {
    componentId: 'mb-asus-tuf-z790-plus-ddr5',
    type: 'motherboard',
    chipset: 'Z790',
    socket: 'LGA1700',
    memoryType: 'DDR5',
    formFactor: 'ATX',
    performanceScore: 90,
    expansionSupport: ['PCIe 5.0', 'M.2 NVMe', 'Wi-Fi']
  },
  {
    componentId: 'case-mid-tower-airflow',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 320,
    airflowScore: 82,
    performanceScore: 78
  },
  {
    componentId: 'case-cooler-master-q300l',
    type: 'case',
    formFactorSupport: ['mATX', 'ITX'],
    maxGpuLength: 360,
    airflowScore: 72,
    performanceScore: 70
  },
  {
    componentId: 'case-nzxt-h5-flow',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 365,
    airflowScore: 88,
    performanceScore: 84
  },
  {
    componentId: 'case-corsair-4000d-airflow',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 360,
    airflowScore: 90,
    performanceScore: 86
  },
  {
    componentId: 'case-montech-air-903-base',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 400,
    airflowScore: 86,
    performanceScore: 82
  },
  {
    componentId: 'case-compact-matx',
    type: 'case',
    formFactorSupport: ['mATX', 'ITX'],
    maxGpuLength: 220,
    airflowScore: 58,
    performanceScore: 55
  },
  {
    componentId: 'case-gamer-atx-rgb',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 330,
    airflowScore: 76,
    performanceScore: 74
  },
  {
    componentId: 'ram-kingston-fury-16gb-ddr4-3600',
    type: 'ram',
    capacity: 16,
    speed: 3600,
    memoryType: 'DDR4',
    performanceScore: 64,
    gamingScore: 66,
    productivityScore: 62,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  },
  {
    componentId: 'ram-crucial-32gb-ddr4-3200',
    type: 'ram',
    capacity: 32,
    speed: 3200,
    memoryType: 'DDR4',
    performanceScore: 72,
    gamingScore: 70,
    productivityScore: 78,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  },
  {
    componentId: 'ram-kingston-fury-16gb-ddr5-5200',
    type: 'ram',
    capacity: 16,
    speed: 5200,
    memoryType: 'DDR5',
    performanceScore: 70,
    gamingScore: 72,
    productivityScore: 70,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  },
  {
    componentId: 'ssd-kingston-a400-960gb',
    type: 'storage',
    capacity: 960,
    interface: 'SATA',
    readSpeed: 500,
    writeSpeed: 450,
    performanceScore: 45,
    gamingScore: 45,
    productivityScore: 42,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  },
  {
    componentId: 'ssd-samsung-970-evo-plus-250gb',
    type: 'storage',
    capacity: 250,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 2300,
    performanceScore: 68,
    gamingScore: 66,
    productivityScore: 68,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  },
  {
    componentId: 'ssd-samsung-980-pro-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 7000,
    writeSpeed: 5000,
    performanceScore: 88,
    gamingScore: 86,
    productivityScore: 90,
    recommendedUse: [
      'gaming',
      'general',
      'programming'
    ]
  }
];

// Internal illustrative scores only. No physical benchmark or FPS measurement.
// Cooling accessories intentionally have no performance parameters.
performanceParameters.push(...[...catalogV21, ...replacementCatalog, ...marketRevalidationCatalog].filter(c => ['ram', 'storage'].includes(c.category) && c.performanceModelStatus !== 'unavailable').map(component => {
  const { specs } = component;
  const score = component.category === 'ram'
    ? Math.min(92, 50 + specs.capacityGb / 2 + (specs.speedMhz - 3200) / 200)
    : Math.min(92, 50 + specs.readSpeedMbS / 200);
  return {
    componentId: component.id,
    type: component.category,
    capacity: specs.capacityGb,
    ...(component.category === 'ram'
      ? { speed: specs.speedMhz, memoryType: specs.memoryType }
      : { interface: specs.interface, readSpeed: specs.readSpeedMbS, writeSpeed: specs.writeSpeedMbS }),
    performanceScore: score,
    gamingScore: score,
    productivityScore: score,
    scoreKind: 'internal-demonstrative',
    scoreInputs: component.category === 'ram'
      ? { capacityGb: specs.capacityGb, speedMhz: specs.speedMhz } : { readSpeedMbS: specs.readSpeedMbS },
    scoreFormula: component.category === 'ram'
      ? 'min(92, 50 + capacityGb / 2 + (speedMhz - 3200) / 200)' : 'min(92, 50 + readSpeedMbS / 200)',
    scoreLimitations: 'Modelo interno simplificado: não mede latência, controlador, durabilidade, temperatura ou desempenho sustentado. Taxas declaradas pelo fabricante não são medições.',
    scoreDisclaimer: 'Índice interno demonstrativo; não é benchmark, medição de FPS ou ganho garantido',
    recommendedUse: ['general', 'study', 'gaming', 'programming']
  };
}));

// Exact boards may use the already-defined internal chip-family model. This
// does not measure the board, apply a factory-OC uplift, or verify board draw.
performanceParameters.push(...marketRevalidationCatalog.filter(c => c.performanceFamilyId).map(component => {
  const family = performanceParameters.find(parameter => parameter.componentId === component.performanceFamilyId);
  return { ...family, componentId: component.id,
    vram: component.specs.vramGb, memoryType: component.specs.memoryType,
    tdp: component.id === 'gpu-msi-rtx-4060-ventus-2x-black-8g-oc' ? 120 : component.powerReference?.watts,
    tdpBasis: component.id === 'gpu-msi-rtx-4060-ventus-2x-black-8g-oc'
      ? 'Limite conservador de planejamento: MSI informa 115 W ou 120 W; revisão não diferenciada.'
      : 'Referência declarada para a família do chip; não é consumo medido ou máximo verificado desta placa.',
    scoreKind: 'internal-family-estimate', performanceFamilyId: component.performanceFamilyId,
    scoreDisclaimer: 'Modelo interno da família do chip; sem benchmark desta placa e sem ganho presumido por overclock.' };
}));
