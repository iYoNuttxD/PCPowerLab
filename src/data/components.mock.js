import { attachDatedReference } from './dated-price-references.js';
import { attachComponentImage } from './component-images.js';
import { catalogV21 } from './catalog.v21.js';
import { enrichCaseCooling } from './caseCooling.v21.js';

export const components = [
  {
    id: 'cpu-ryzen-5-5500',
    name: 'AMD Ryzen 5 5500',
    category: 'cpu',
    brand: 'AMD',
    price: 589.9,
    specs: {
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClockGhz: 3.6,
      boostClockGhz: 4.2,
      tdpWatts: 65
    }
  },
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
      boostClockGhz: 4.4,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-ryzen-7-5700x',
    name: 'AMD Ryzen 7 5700X',
    category: 'cpu',
    brand: 'AMD',
    price: 1199.9,
    specs: {
      socket: 'AM4',
      cores: 8,
      threads: 16,
      baseClockGhz: 3.4,
      boostClockGhz: 4.6,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-ryzen-7-5800x3d',
    name: 'AMD Ryzen 7 5800X3D',
    category: 'cpu',
    brand: 'AMD',
    price: 1899.9,
    specs: {
      socket: 'AM4',
      cores: 8,
      threads: 16,
      baseClockGhz: 3.4,
      boostClockGhz: 4.5,
      tdpWatts: 105
    }
  },
  {
    id: 'cpu-ryzen-5-7600',
    name: 'AMD Ryzen 5 7600',
    category: 'cpu',
    brand: 'AMD',
    price: 1399.9,
    specs: {
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClockGhz: 3.8,
      boostClockGhz: 5.1,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-ryzen-7-7700',
    name: 'AMD Ryzen 7 7700',
    category: 'cpu',
    brand: 'AMD',
    price: 1999.9,
    specs: {
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClockGhz: 3.8,
      boostClockGhz: 5.3,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-intel-i3-12100f',
    name: 'Intel Core i3-12100F',
    category: 'cpu',
    brand: 'Intel',
    price: 549.9,
    specs: {
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClockGhz: 3.3,
      boostClockGhz: 4.3,
      tdpWatts: 58
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
      boostClockGhz: 4.4,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-intel-i5-13400f',
    name: 'Intel Core i5-13400F',
    category: 'cpu',
    brand: 'Intel',
    price: 1199.9,
    specs: {
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClockGhz: 2.5,
      boostClockGhz: 4.6,
      tdpWatts: 65
    }
  },
  {
    id: 'cpu-intel-i5-13600k',
    name: 'Intel Core i5-13600K',
    category: 'cpu',
    brand: 'Intel',
    price: 1899.9,
    specs: {
      socket: 'LGA1700',
      cores: 14,
      threads: 20,
      baseClockGhz: 3.5,
      boostClockGhz: 5.1,
      tdpWatts: 125
    }
  },
  {
    id: 'cpu-intel-i7-13700k',
    name: 'Intel Core i7-13700K',
    category: 'cpu',
    brand: 'Intel',
    price: 2699.9,
    specs: {
      socket: 'LGA1700',
      cores: 16,
      threads: 24,
      baseClockGhz: 3.4,
      boostClockGhz: 5.4,
      tdpWatts: 125
    }
  },
  {
    id: 'cpu-intel-i5-14400f',
    name: 'Intel Core i5-14400F',
    category: 'cpu',
    brand: 'Intel',
    price: 1299.9,
    specs: {
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClockGhz: 2.5,
      boostClockGhz: 4.7,
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
      chipset: 'B550',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-asus-tuf-b550m-plus',
    name: 'ASUS TUF Gaming B550M-Plus',
    category: 'motherboard',
    brand: 'ASUS',
    price: 899.9,
    specs: {
      socket: 'AM4',
      memoryType: 'DDR4',
      formFactor: 'mATX',
      chipset: 'B550',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-msi-b550-tomahawk',
    name: 'MSI B550 Tomahawk',
    category: 'motherboard',
    brand: 'MSI',
    price: 1099.9,
    specs: {
      socket: 'AM4',
      memoryType: 'DDR4',
      formFactor: 'ATX',
      chipset: 'B550',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-asus-prime-b650m-a',
    name: 'ASUS Prime B650M-A',
    category: 'motherboard',
    brand: 'ASUS',
    price: 1199.9,
    specs: {
      socket: 'AM5',
      memoryType: 'DDR5',
      formFactor: 'mATX',
      chipset: 'B650',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-gigabyte-b650-gaming-x-ax',
    name: 'Gigabyte B650 Gaming X AX',
    category: 'motherboard',
    brand: 'Gigabyte',
    price: 1499.9,
    specs: {
      socket: 'AM5',
      memoryType: 'DDR5',
      formFactor: 'ATX',
      chipset: 'B650',
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
      chipset: 'H610',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-msi-pro-b660m-a-ddr4',
    name: 'MSI PRO B660M-A DDR4',
    category: 'motherboard',
    brand: 'MSI',
    price: 799.9,
    specs: {
      socket: 'LGA1700',
      memoryType: 'DDR4',
      formFactor: 'mATX',
      chipset: 'B660',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-gigabyte-b760m-ds3h-ddr4',
    name: 'Gigabyte B760M DS3H DDR4',
    category: 'motherboard',
    brand: 'Gigabyte',
    price: 949.9,
    specs: {
      socket: 'LGA1700',
      memoryType: 'DDR4',
      formFactor: 'mATX',
      chipset: 'B760',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'mb-asus-tuf-z790-plus-ddr5',
    name: 'ASUS TUF Gaming Z790-Plus DDR5',
    category: 'motherboard',
    brand: 'ASUS',
    price: 2199.9,
    specs: {
      socket: 'LGA1700',
      memoryType: 'DDR5',
      formFactor: 'ATX',
      chipset: 'Z790',
      storageInterfaces: ['M.2 NVMe', 'SATA']
    }
  },
  {
    id: 'gpu-gtx-1650',
    name: 'NVIDIA GeForce GTX 1650 4GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 799.9,
    specs: {
      vramGb: 4,
      tdpWatts: 75,
      recommendedPsuWatts: 350,
      lengthMm: 170
    }
  },
  {
    id: 'gpu-rtx-3050',
    name: 'NVIDIA GeForce RTX 3050 8GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 1299.9,
    specs: {
      vramGb: 8,
      tdpWatts: 130,
      recommendedPsuWatts: 450,
      lengthMm: 230
    }
  },
  {
    id: 'gpu-rtx-3060',
    name: 'NVIDIA GeForce RTX 3060 12GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 1599.9,
    specs: {
      vramGb: 12,
      tdpWatts: 170,
      recommendedPsuWatts: 550,
      lengthMm: 242
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
      tdpWatts: 115,
      recommendedPsuWatts: 550,
      lengthMm: 240
    }
  },
  {
    id: 'gpu-rtx-4060-ti',
    name: 'NVIDIA GeForce RTX 4060 Ti 8GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 2499.9,
    specs: {
      vramGb: 8,
      tdpWatts: 160,
      recommendedPsuWatts: 550,
      lengthMm: 245
    }
  },
  {
    id: 'gpu-rtx-4070',
    name: 'NVIDIA GeForce RTX 4070 12GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 3899.9,
    specs: {
      vramGb: 12,
      tdpWatts: 200,
      recommendedPsuWatts: 650,
      lengthMm: 270
    }
  },
  {
    id: 'gpu-rtx-4070-super',
    name: 'NVIDIA GeForce RTX 4070 Super 12GB',
    category: 'gpu',
    brand: 'NVIDIA',
    price: 4499.9,
    specs: {
      vramGb: 12,
      tdpWatts: 220,
      recommendedPsuWatts: 700,
      lengthMm: 300
    }
  },
  {
    id: 'gpu-rx-6600',
    name: 'AMD Radeon RX 6600 8GB',
    category: 'gpu',
    brand: 'AMD',
    price: 1199.9,
    specs: {
      vramGb: 8,
      tdpWatts: 132,
      recommendedPsuWatts: 450,
      lengthMm: 200
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
      tdpWatts: 165,
      recommendedPsuWatts: 550,
      lengthMm: 235
    }
  },
  {
    id: 'gpu-rx-7700-xt',
    name: 'AMD Radeon RX 7700 XT 12GB',
    category: 'gpu',
    brand: 'AMD',
    price: 3299.9,
    specs: {
      vramGb: 12,
      tdpWatts: 245,
      recommendedPsuWatts: 700,
      lengthMm: 280
    }
  },
  {
    id: 'gpu-rx-7800-xt',
    name: 'AMD Radeon RX 7800 XT 16GB',
    category: 'gpu',
    brand: 'AMD',
    price: 3999.9,
    specs: {
      vramGb: 16,
      tdpWatts: 263,
      recommendedPsuWatts: 750,
      lengthMm: 305
    }
  },
  {
    id: 'ram-kingston-fury-8gb-ddr4',
    name: 'Kingston Fury Beast 8GB DDR4',
    category: 'ram',
    brand: 'Kingston',
    price: 149.9,
    specs: {
      memoryType: 'DDR4',
      capacityGb: 8,
      speedMhz: 3200
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
    id: 'ram-kingston-fury-32gb-ddr4',
    name: 'Kingston Fury Beast 32GB DDR4',
    category: 'ram',
    brand: 'Kingston',
    price: 499.9,
    specs: {
      memoryType: 'DDR4',
      capacityGb: 32,
      speedMhz: 3200
    }
  },
  {
    id: 'ram-corsair-vengeance-16gb-ddr4-3600',
    name: 'Corsair Vengeance 16GB DDR4',
    category: 'ram',
    brand: 'Corsair',
    price: 289.9,
    specs: {
      memoryType: 'DDR4',
      capacityGb: 16,
      speedMhz: 3600
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
    id: 'ram-corsair-vengeance-32gb-ddr5-5600',
    name: 'Corsair Vengeance 32GB DDR5',
    category: 'ram',
    brand: 'Corsair',
    price: 749.9,
    specs: {
      memoryType: 'DDR5',
      capacityGb: 32,
      speedMhz: 5600
    }
  },
  {
    id: 'ram-kingston-fury-16gb-ddr5-6000',
    name: 'Kingston Fury Beast 16GB DDR5',
    category: 'ram',
    brand: 'Kingston',
    price: 449.9,
    specs: {
      memoryType: 'DDR5',
      capacityGb: 16,
      speedMhz: 6000
    }
  },
  {
    id: 'ram-gskill-trident-z5-32gb-ddr5-6000',
    name: 'G.Skill Trident Z5 32GB DDR5',
    category: 'ram',
    brand: 'G.Skill',
    price: 899.9,
    specs: {
      memoryType: 'DDR5',
      capacityGb: 32,
      speedMhz: 6000
    }
  },
  {
    id: 'ssd-kingston-a400-480gb',
    name: 'Kingston A400 480GB SATA SSD',
    category: 'storage',
    brand: 'Kingston',
    price: 189.9,
    specs: {
      interface: 'SATA',
      storageType: 'SSD',
      capacityGb: 480,
      readSpeedMbS: 500,
      writeSpeedMbS: 450
    }
  },
  {
    id: 'ssd-kingston-nv2-500gb',
    name: 'Kingston NV2 500GB NVMe',
    category: 'storage',
    brand: 'Kingston',
    price: 239.9,
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 500,
      readSpeedMbS: 3500,
      writeSpeedMbS: 2100
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
      storageType: 'SSD',
      capacityGb: 1000,
      readSpeedMbS: 3500,
      writeSpeedMbS: 2100
    }
  },
  {
    id: 'ssd-wd-blue-sn570-1tb',
    name: 'WD Blue SN570 1TB NVMe',
    category: 'storage',
    brand: 'Western Digital',
    price: 399.9,
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 1000,
      readSpeedMbS: 3500,
      writeSpeedMbS: 3000
    }
  },
  {
    id: 'ssd-wd-black-sn770-1tb',
    name: 'WD Black SN770 1TB NVMe',
    category: 'storage',
    brand: 'Western Digital',
    price: 549.9,
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 1000,
      readSpeedMbS: 5150,
      writeSpeedMbS: 4900
    }
  },
  {
    id: 'ssd-samsung-970-evo-plus-1tb',
    name: 'Samsung 970 EVO Plus 1TB NVMe',
    category: 'storage',
    brand: 'Samsung',
    price: 599.9,
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 1000,
      readSpeedMbS: 3500,
      writeSpeedMbS: 3300
    }
  },
  {
    id: 'ssd-samsung-980-pro-2tb',
    name: 'Samsung 980 Pro 2TB NVMe',
    category: 'storage',
    brand: 'Samsung',
    price: 1199.9,
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 2000,
      readSpeedMbS: 7000,
      writeSpeedMbS: 5100
    }
  },
  {
    id: 'hdd-seagate-barracuda-2tb',
    name: 'Seagate Barracuda 2TB HDD',
    category: 'storage',
    brand: 'Seagate',
    price: 299.9,
    specs: {
      interface: 'SATA',
      storageType: 'HDD',
      capacityGb: 2000,
      readSpeedMbS: 190,
      writeSpeedMbS: 180
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
    id: 'psu-corsair-cv550',
    name: 'Corsair CV550 550W',
    category: 'psu',
    brand: 'Corsair',
    price: 329.9,
    specs: {
      watts: 550,
      efficiency: '80 Plus Bronze'
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
    id: 'psu-cooler-master-mwe-650w',
    name: 'Cooler Master MWE 650W Bronze',
    category: 'psu',
    brand: 'Cooler Master',
    price: 449.9,
    specs: {
      watts: 650,
      efficiency: '80 Plus Bronze'
    }
  },
  {
    id: 'psu-xpg-pylon-650w',
    name: 'XPG Pylon 650W',
    category: 'psu',
    brand: 'XPG',
    price: 429.9,
    specs: {
      watts: 650,
      efficiency: '80 Plus Bronze'
    }
  },
  {
    id: 'psu-corsair-rm750e',
    name: 'Corsair RM750e 750W Gold',
    category: 'psu',
    brand: 'Corsair',
    price: 699.9,
    specs: {
      watts: 750,
      efficiency: '80 Plus Gold'
    }
  },
  {
    id: 'psu-xpg-core-reactor-850w',
    name: 'XPG Core Reactor 850W Gold',
    category: 'psu',
    brand: 'XPG',
    price: 799.9,
    specs: {
      watts: 850,
      efficiency: '80 Plus Gold'
    }
  },
  {
    id: 'psu-corsair-rm850x',
    name: 'Corsair RM850x 850W Gold',
    category: 'psu',
    brand: 'Corsair',
    price: 899.9,
    specs: {
      watts: 850,
      efficiency: '80 Plus Gold'
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
  },
  {
    id: 'case-cooler-master-q300l',
    name: 'Cooler Master MasterBox Q300L',
    category: 'case',
    brand: 'Cooler Master',
    price: 349.9,
    specs: {
      supportedFormFactors: ['mATX', 'ITX'],
      maxGpuLengthMm: 360
    }
  },
  {
    id: 'case-nzxt-h5-flow',
    name: 'NZXT H5 Flow',
    category: 'case',
    brand: 'NZXT',
    price: 649.9,
    specs: {
      supportedFormFactors: ['ATX', 'mATX', 'ITX'],
      maxGpuLengthMm: 365
    }
  },
  {
    id: 'case-corsair-4000d-airflow',
    name: 'Corsair 4000D Airflow',
    category: 'case',
    brand: 'Corsair',
    price: 699.9,
    specs: {
      supportedFormFactors: ['ATX', 'mATX', 'ITX'],
      maxGpuLengthMm: 360
    }
  },
  {
    id: 'case-montech-air-903-base',
    name: 'Montech Air 903 Base',
    category: 'case',
    brand: 'Montech',
    price: 399.9,
    specs: {
      supportedFormFactors: ['ATX', 'mATX', 'ITX'],
      maxGpuLengthMm: 400
    }
  },
  {
    id: 'case-compact-matx',
    name: 'Gabinete Compact mATX',
    category: 'case',
    brand: 'PCPowerLab',
    price: 219.9,
    specs: {
      supportedFormFactors: ['mATX', 'ITX'],
      maxGpuLengthMm: 220
    }
  },
  {
    id: 'case-gamer-atx-rgb',
    name: 'Gabinete Gamer ATX RGB',
    category: 'case',
    brand: 'PCPowerLab',
    price: 459.9,
    specs: {
      supportedFormFactors: ['ATX', 'mATX', 'ITX'],
      maxGpuLengthMm: 330
    }
  },
  {
    id: 'ram-kingston-fury-16gb-ddr4-3600',
    name: 'Kingston Fury Beast 16GB DDR4-3600',
    category: 'ram',
    brand: 'Kingston',
    price: 299.9,
    partNumber: 'KF436C18BB/16',
    specSourceUrl: 'https://www.kingston.com/dataSheets/KF436C18BB_16.pdf',
    specs: {
      memoryType: 'DDR4',
      capacityGb: 16,
      speedMhz: 3600
    }
  },
  {
    id: 'ram-crucial-32gb-ddr4-3200',
    name: 'Crucial 32GB DDR4-3200 UDIMM',
    category: 'ram',
    brand: 'Crucial',
    price: 529.9,
    partNumber: 'CT32G4DFD832A',
    specSourceUrl: 'https://eu.crucial.com/memory/ddr4/ct32g4dfd832a/ct26139276',
    specs: {
      memoryType: 'DDR4',
      capacityGb: 32,
      speedMhz: 3200
    }
  },
  {
    id: 'ram-kingston-fury-16gb-ddr5-5200',
    name: 'Kingston Fury Beast 16GB DDR5-5200',
    category: 'ram',
    brand: 'Kingston',
    price: 419.9,
    partNumber: 'KF552C40BB-16',
    specSourceUrl: 'https://www.kingston.com/dataSheets/KF552C40BB-16.pdf',
    specs: {
      memoryType: 'DDR5',
      capacityGb: 16,
      speedMhz: 5200
    }
  },
  {
    id: 'ssd-kingston-a400-960gb',
    name: 'Kingston A400 960GB SATA SSD',
    category: 'storage',
    brand: 'Kingston',
    price: 329.9,
    partNumber: 'SA400S37/960G',
    specSourceUrl: 'https://www.kingston.com/en/ssd/a400-solid-state-drive',
    specs: {
      interface: 'SATA',
      storageType: 'SSD',
      capacityGb: 960,
      readSpeedMbS: 500,
      writeSpeedMbS: 450
    }
  },
  {
    id: 'ssd-samsung-970-evo-plus-250gb',
    name: 'Samsung 970 EVO Plus 250GB NVMe',
    category: 'storage',
    brand: 'Samsung',
    price: 249.9,
    partNumber: 'MZ-V7S250',
    specSourceUrl: 'https://download.semiconductor.samsung.com/resources/data-sheet/Samsung_NVMe_SSD_970_EVO_Plus_Data_Sheet_Rev.3.0_10129514071343.pdf',
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 250,
      readSpeedMbS: 3500,
      writeSpeedMbS: 2300
    }
  },
  {
    id: 'ssd-samsung-980-pro-1tb',
    name: 'Samsung 980 PRO 1TB NVMe',
    category: 'storage',
    brand: 'Samsung',
    price: 699.9,
    partNumber: 'MZ-V8P1T0',
    specSourceUrl: 'https://download.semiconductor.samsung.com/resources/data-sheet/Samsung-NVMe-SSD-980-PRO-Data-Sheet_Rev.2.1_230509_10129500052824.pdf',
    specs: {
      interface: 'M.2 NVMe',
      storageType: 'SSD',
      capacityGb: 1000,
      readSpeedMbS: 7000,
      writeSpeedMbS: 5000
    }
  },
  ...catalogV21
].map(enrichCaseCooling).map(attachComponentImage).map(attachDatedReference);
