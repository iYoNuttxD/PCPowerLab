// Limits come from model-specific manufacturer pages; ambiguous models remain unknown.
export const motherboardLimits = {
  'mb-b550m-aorus-elite': {
    'sourceUrl': 'https://www.gigabyte.com/uk/Motherboard/B550M-AORUS-ELITE-rev-10-11-12/sp',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 128,
      'm2Slots': 2,
      'm2SupportedLengthsMm': [
        42,
        60,
        80,
        110
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  },
  'mb-asus-tuf-b550m-plus': {
    'sourceUrl': 'https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b550m-plus/techspec/',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 128,
      'm2Slots': 2,
      'm2SupportedLengthsMm': [
        42,
        60,
        80,
        110
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  },
  'mb-msi-b550-tomahawk': {
    'sourceUrl': 'https://www.msi.com/Motherboard/MAG-B550-TOMAHAWK/Specification',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 128,
      'm2Slots': 2,
      'm2SupportedLengthsMm': [
        42,
        60,
        80,
        110
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  },
  'mb-gigabyte-b650-gaming-x-ax': {
    'sourceUrl': 'https://www.gigabyte.com/pk/Motherboard/B650-GAMING-X-AX-rev-10-11-12/sp',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 256,
      'm2Slots': 3,
      'm2SupportedLengthsMm': [
        80,
        110
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  },
  'mb-msi-pro-b660m-a-ddr4': {
    'sourceUrl': 'https://www.msi.com/Motherboard/PRO-B660M-A-DDR4/Specification',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 128,
      'm2Slots': 2,
      'm2SupportedLengthsMm': [
        42,
        60,
        80
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  },
  'mb-gigabyte-b760m-ds3h-ddr4': {
    'sourceUrl': 'https://www.gigabyte.com/jp/Motherboard/B760M-DS3H-DDR4-rev-10/sp',
    'specs': {
      'memorySlots': 4,
      'maxMemoryGb': 128,
      'm2Slots': 2,
      'm2SupportedLengthsMm': [
        80
      ],
      'memorySupportNotes': 'Limites de slots e capacidade publicados pelo fabricante. Velocidade XMP/EXPO depende de CPU, BIOS, população dos slots e lista QVL.',
      'storageSupportNotes': 'Escolher slot compatível com o tamanho do SSD; geração PCIe e compartilhamento de pistas dependem do slot, CPU e revisão da placa.'
    }
  }
};

export function enrichMotherboardLimits(component) {
  const verified = motherboardLimits[component.id];
  if (component.category !== 'motherboard' || !verified) return component;
  return { ...component, additionalSpecSourceUrls: [...new Set([...(component.additionalSpecSourceUrls || []), verified.sourceUrl])],
    dependencySpecsVerifiedAt: '2026-10-08',
    specs: { ...component.specs, ...verified.specs } };
}
