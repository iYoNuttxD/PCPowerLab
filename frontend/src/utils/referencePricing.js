export function datedReference(component) {
  const pricing = component?.pricing;
  return pricing?.updateStatus === 'dated_snapshot' && pricing?.source === 'dated_public_reference'
    && pricing.isMarketQuote === false && Number.isFinite(component?.price) && pricing.price === component.price ? pricing : null;
}
export function referenceLabel(component) {
  const reference = datedReference(component);
  return reference ? `Referência datada · PIX · ${reference.queriedAt}` : 'Preço estimado · sem fonte datada validada';
}
export function referenceCoverage(selection = {}) {
  let dated = 0, estimated = 0;
  for (const [slot, value] of Object.entries(selection || {})) {
    const items = slot === 'fans' ? (Array.isArray(value) ? value : []) : value?.id ? [value] : [];
    for (const item of items) {
      const quantity = slot === 'fans' && Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      if (datedReference(item)) dated += quantity;
      else estimated += quantity;
    }
  }
  return { dated, estimated, total: dated + estimated };
}
export const priceMethodology = 'Total de referência: combina registros datados à vista (PIX) e estimativas da base demonstrativa nas peças sem fonte validada. Não é cotação ao vivo; frete, montagem e eventuais tributos adicionais não incluídos. Valores de cartão são informados separadamente e não entram no total.';
