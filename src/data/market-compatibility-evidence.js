// Additional manufacturer evidence for an unchanged exact SKU. Applied only to
// compatibility evaluation; saved identities/specifications are not rewritten.
export function supplementalCompatibilityEvidence(component) {
  if (component?.id !== 'case-cooler-master-elite-502-white'
    || component.partNumber !== 'E502-WGNN-S00' || component.brand !== 'Cooler Master') return null;
  return {
    sourceUrl: 'https://www.coolermaster.com/en-us/products/elite-502.html',
    verifiedAt: '2026-10-08',
    specs: { supportedPsuFormFactors: ['ATX'], maxPsuLengthMm: 170 },
    note: 'Limite conservador com gaiola HDD; 210 mm somente sem a gaiola. Não presume remoção de peças.'
  };
}
