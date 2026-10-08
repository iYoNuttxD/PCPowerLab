export function datedReference(component) {
  const pricing = component?.pricing;
  return pricing?.updateStatus === 'dated_snapshot' && pricing?.source === 'dated_public_reference'
    && pricing.isMarketQuote === false && pricing.referenceScope === 'exact'
    && ['exact', 'exact_variant'].includes(pricing.identityMatch)
    && pricing.verificationMethod === 'rendered_product_page' && pricing.observedAvailability === 'available'
    && typeof pricing.availabilityEvidence === 'string' && pricing.availabilityEvidence.trim().length > 0
    && pricing.observationSource?.kind === 'manual_public_page_observation' && pricing.observationSource.authorizedApi === false
    && typeof pricing.observedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(pricing.observedAt)
    && Number.isFinite(Date.parse(pricing.observedAt)) && Date.parse(pricing.observedAt) <= Date.now()
    && new Date(`${pricing.observedAt.slice(0, 10)}T00:00:00.000Z`).toISOString().slice(0, 10) === pricing.observedAt.slice(0, 10)
    && Number.isFinite(component?.price) && pricing.price === component.price ? pricing : null;
}
function referenceValue(component) {
  if ((component?.priceKind === 'dated-reference-snapshot' || component?.pricing?.updateStatus === 'dated_snapshot') && !datedReference(component)) return null;
  return typeof component?.price === 'number' && Number.isFinite(component.price) && component.price > 0 ? component.price : null;
}
export function referenceLabel(component) {
  const reference = datedReference(component);
  if (referenceValue(component) === null) return 'Sem cotação';
  const observedLabel = reference ? `${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(reference.observedAt))} UTC` : null;
  return reference ? ['Referência PIX', reference.store, observedLabel].filter(Boolean).join(' · ') : 'Estimativa do catálogo';
}
export function referenceCoverage(selection = {}) {
  let dated = 0, estimated = 0;
  for (const [slot, value] of Object.entries(selection || {})) {
    const items = slot === 'fans' ? (Array.isArray(value) ? value : []) : value?.id ? [value] : [];
    for (const item of items) {
      const quantity = slot === 'fans' && Number.isSafeInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      if (datedReference(item)) dated += quantity;
      else if (referenceValue(item) !== null) estimated += quantity;
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
      if (referenceValue(item) !== null) total += Math.round(item.price * 100) * quantity;
      else missing += quantity;
    }
  }
  return { subtotal: total / 100, missing };
}
