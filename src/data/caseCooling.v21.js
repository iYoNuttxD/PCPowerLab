import { replacementCatalog } from './catalogReplacements.js';

// Capacities for different diameters are alternative layouts, not additive.
// Position/clearance interactions still require the case manual.
export const caseCoolingV21 = {
  ...Object.fromEntries(replacementCatalog.filter(component => component.category === 'case').map(component => [component.id, {
    source: component.specSourceUrl, partNumber: component.partNumber, specs: component.specs
  }])),
  'case-cooler-master-q300l': {
    source: 'https://www.coolermaster.com/en-global/products/masterbox-q300l.html',
    partNumber: 'MCB-Q300L-KANN-S00',
    specs: {
      maxCoolerHeightMm: 159,
      radiatorSizesMm: [120, 240],
      fanMounts: [{ diameterMm: 120, capacity: 6 }, { diameterMm: 140, capacity: 2 }],
      includedFanCount: 1,
      maxFanThicknessMm: null,
      maxRadiatorThicknessMm: null,
      coolingSupportNotes: '120/240 mm na frente, 120 mm atrás. Fans: frente 2×120/140; topo 2×120; traseira 1×120; base 1×120. Layouts alternativos; conferir interferências no manual.'
    }
  },
  'case-corsair-4000d-airflow': {
    source: 'https://www.corsair.com/ww/en/p/pc-cases/cc-9011200-ww/4000d-airflow-temper',
    partNumber: 'CC-9011200-WW',
    specs: {
      maxCoolerHeightMm: 170,
      radiatorSizesMm: [120, 140, 240, 280, 360],
      fanMounts: [{ diameterMm: 120, capacity: 6 }, { diameterMm: 140, capacity: 4 }],
      includedFanCount: 2,
      maxFanThicknessMm: null,
      maxRadiatorThicknessMm: null,
      coolingSupportNotes: '360 mm na frente; 280 mm no topo depende da altura da RAM. AIO frontal reduz folga de GPU. Capacidades de fans por diâmetro são layouts alternativos.'
    }
  },
  'case-montech-air-903-base': {
    source: 'https://www.montechpc.com/air-903-base',
    specs: {
      maxCoolerHeightMm: 180,
      radiatorSizesMm: [120, 140, 240, 280, 360],
      fanMounts: [{ diameterMm: 120, capacity: 9 }, { diameterMm: 140, capacity: 6 }],
      includedFanCount: 3,
      maxFanThicknessMm: null,
      maxRadiatorThicknessMm: null,
      coolingSupportNotes: 'Radiadores no topo/frente. Fans: topo 3×120/2×140; frente 3×120/3×140; PSU shroud 2×120; traseira 1×120/1×140. Não somar layouts alternativos.'
    }
  }
};

export function enrichCaseCooling(component) {
  if (component.category !== 'case') return component;
  const verified = caseCoolingV21[component.id];
  return {
    ...component,
    ...(verified ? {
      coolingSpecSourceUrl: verified.source,
      coolingSpecVerifiedAt: '2026-10-08',
      ...(verified.partNumber ? { partNumber: verified.partNumber } : {})
    } : {}),
    specs: {
      ...component.specs,
      maxCoolerHeightMm: null,
      radiatorSizesMm: null,
      fanMounts: null,
      includedFanCount: null,
      maxFanThicknessMm: null,
      maxRadiatorThicknessMm: null,
      ...(verified?.specs ?? {
        coolingSupportNotes: component.id === 'case-nzxt-h5-flow'
          ? 'Revisão/ano do H5 Flow não identificado no cadastro legado; suporte de refrigeração não verificado.'
          : 'Gabinete demonstrativo sem modelo oficial verificável; suporte de refrigeração desconhecido.'
      })
    }
  };
}
