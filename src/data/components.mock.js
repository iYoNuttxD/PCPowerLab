export const components = [
  {
    id: 'cpu-ryzen-5-5600',
    name: 'AMD Ryzen 5 5600',
    category: 'cpu',
    brand: 'AMD',
    price: 799.9,
    specs: {
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClockGhz: 3.5,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-intel-i5-12400f',
    name: 'Intel Core i5-12400F',
    category: 'cpu',
    brand: 'Intel',
    price: 849.9,
    specs: {
      socket: 'LGA1700',
      cores: 6,
      threads: 12,
      baseClockGhz: 2.5,
      tdpWatts: 65
    }
  },
  {
    id: 'mb-b550m-aorus-elite',
    name: 'Gigabyte B550M Aorus Elite',
    category: 'motherboard',
    brand: 'Gigabyte',
    price: 699.9,
    specs: {
      socket: 'AM4',
      memoryType: 'DDR4',
      formFactor: 'mATX',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-h610m-ddr4',
    name: 'ASUS Prime H610M DDR4',
    category: 'motherboard',
    brand: 'ASUS',
    price: 589.9,
    specs: {
      socket: 'LGA1700',
      memoryType: 'DDR4',
      formFactor: 'mATX',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'gpu-rtx-4060',
    name: 'NVIDIA GeForce RTX 4060 8GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 1899.9,
    specs: {
      vramGb: 8,
      recommendedPsuWatts: 550,
      lengthMm: 240
    }
  },
  {
    id: 'gpu-rx-7600',
    name: 'AMD Radeon RX 7600 8GB',
    category: 'gpu',
    brand: 'AMD',
    price: 1699.9,
    specs: {
      vramGb: 8,
      recommendedPsuWatts: 550,
      lengthMm: 235
    }
  },
  {
    id: 'ram-kingston-fury-16gb-ddr4',
    name: 'Kingston Fury Beast 16GB DDR4',
    category: 'ram',
    brand: 'Kingston',
    price: 249.9,
    specs: {
      memoryType: 'DDR4',
      capacityGb: 16,
      speedMhz: 3200
    }
  },
  {
    id: 'ram-corsair-vengeance-16gb-ddr5',
    name: 'Corsair Vengeance 16GB DDR5',
    category: 'ram',
    brand: 'Corsair',
    price: 399.9,
    specs: {
      memoryType: 'DDR5',
      capacityGb: 16,
      speedMhz: 5200
    }
  },
  {
    id: 'ssd-kingston-nv2-1tb',
    name: 'Kingston NV2 1TB NVMe',
    category: 'storage',
    brand: 'Kingston',
    price: 349.9,
    specs: {
      interface: 'M.2 NVMe',
      capacityGb: 1000
    }
  },
  {
    id: 'psu-corsair-650w',
    name: 'Corsair CV650 650W',
    category: 'psu',
    brand: 'Corsair',
    price: 399.9,
    specs: {
      watts: 650,
      efficiency: '80 Plus Bronze'
    }
  },
  {
    id: 'psu-generic-400w',
    name: 'Fonte Genérica 400W',
    category: 'psu',
    brand: 'Generic',
    price: 129.9,
    specs: {
      watts: 400,
      efficiency: 'Não informado'
    }
  },
  {
    id: 'case-mid-tower-airflow',
    name: 'Gabinete Mid Tower Airflow',
    category: 'case',
    brand: 'PCPowerLab',
    price: 299.9,
    specs: {
      supportedFormFactors: ['ATX', 'mATX', 'ITX'],
      maxGpuLengthMm: 320
    }
  }
];
