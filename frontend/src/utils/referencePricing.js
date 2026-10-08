export function datedReference(component) {
  const pricing = component?.pricing;
  return pricing?.updateStatus === 'dated_snapshot' && pricing?.source === 'dated_public_reference'
    && pricing.isMarketQuote === false && Number.isFinite(component?.price) && pricing.price === component.price ? pricing : null;
}
export function referenceLabel(component) {
  const reference = datedReference(component);
  if (component?.price == null || component?.price === '') return 'Sem cotação';
  return reference ? ['Referência PIX', reference.store, reference.queriedAt].filter(Boolean).join(' · ') : 'Estimativa do catálogo';
}
export function referenceCoverage(selection = {}) {
  let dated = 0, estimated = 0;
  for (const [slot, value] of Object.entries(selection || {})) {
    const items = slot === 'fans' ? (Array.isArray(value) ? value : []) : value?.id ? [value] : [];
    for (const item of items) {
      const quantity = slot === 'fans' && Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      if (datedReference(item)) dated += quantity;
      else if (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0) estimated += quantity;
    }
  }
  return { dated, estimated, total: dated + estimated };
}

export function knownPriceSubtotal(selection = {}) {
  let total = 0, missing = 0;
  for (const [slot, value] of Object.entries(selection || {})) {
    const items = slot === 'fans' ? (Array.isArray(value) ? value : []) : value?.id ? [value] : [];
    for (const item of items) {
      const quantity = slot === 'fans' && Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      if (typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0) total += Math.round(item.price * 100) * quantity;
      else missing += quantity;
    }
  }
  return { subtotal: total / 100, missing };
}
