import { componentImageIdentity } from './component-images.js';

// Additional manufacturer evidence for an unchanged exact SKU. Applied only to
// compatibility evaluation; saved identities/specifications are not rewritten.
export function supplementalCompatibilityEvidence(component) {
  // Resolves an old unknown using a model-specific manufacturer announcement,
  // without rewriting the catalog identity, photo, or historical price record.
  if (component?.id === 'gpu-msi-rtx-3050-lp-6g-oc'
    && componentImageIdentity(component) === 'e067674d1df79366d57716b348f70a065053f308207abc9a1d570f3a4a56be40') {
    return {
      sourceUrl: 'https://prtimes.jp/main/html/rd/p/000000875.000053749.html',
      additionalSourceUrls: [
        'https://www.ask-corp.jp/products/msi/graphicsboard/geforce-rtx3050/geforce-rtx-3050-lp-6g-oc.html',
        'https://www.msi.com/Graphics-Card/GeForce-RTX-3050-LP-6G-OC/Specification'
      ],
      verifiedAt: '2026-10-20',
      specs: { powerConnectors: [], powerConnectorRequirement: 'none' },
      note: 'Comunicado publicado pela MSI Japan em 02/02/2024 confirma que o modelo LP 6G OC funciona sem conector de alimentação auxiliar; tabela da distribuidora oficial ASK confirma nenhum. Não inferido dos 70 W.'
    };
  }
  if (component?.id !== 'case-cooler-master-elite-502-white'
    || component.partNumber !== 'E502-WGNN-S00' || component.brand !== 'Cooler Master') return null;
  return {
    sourceUrl: 'https://www.coolermaster.com/en-us/products/elite-502.html',
    verifiedAt: '2026-10-08',
    specs: { supportedPsuFormFactors: ['ATX'], maxPsuLengthMm: 170 },
    note: 'Limite conservador com gaiola HDD; 210 mm somente sem a gaiola. Não presume remoção de peças.'
  };
}
