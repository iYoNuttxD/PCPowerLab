export const performanceParameters = [
  {
    componentId: 'cpu-ryzen-5-5600',
    type: 'cpu',
    performanceScore: 78,
    cores: 6,
    threads: 12,
    baseClock: 3.5,
    boostClock: 4.4,
    generation: 'Zen 3',
    tdp: 65,
    recommendedUse: ['gaming', 'general', 'productivity'],
    gamingScore: 76,
    productivityScore: 74
  },
  {
    componentId: 'gpu-rtx-4060',
    type: 'gpu',
    performanceScore: 85,
    gamingScore: 88,
    vram: 8,
    memoryType: 'GDDR6',
    recommendedResolution: '1080p',
    rayTracingSupport: true,
    tdp: 115,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'ram-kingston-fury-16gb-ddr4',
    type: 'ram',
    capacity: 16,
    speed: 3200,
    memoryType: 'DDR4',
    performanceScore: 72,
    recommendedUse: ['gaming', 'general']
  },
  {
    componentId: 'ssd-kingston-nv2-1tb',
    type: 'storage',
    capacity: 1000,
    interface: 'M.2 NVMe',
    readSpeed: 3500,
    writeSpeed: 2100,
    performanceScore: 80,
    recommendedUse: ['gaming', 'general', 'productivity']
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
    componentId: 'case-mid-tower-airflow',
    type: 'case',
    formFactorSupport: ['ATX', 'mATX', 'ITX'],
    maxGpuLength: 320,
    airflowScore: 82,
    performanceScore: 78
  }
];
