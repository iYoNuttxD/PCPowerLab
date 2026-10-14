import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
const records = JSON.parse(readFileSync(new URL('./dated-price-references.json', import.meta.url), 'utf8'));
const allowedHosts = new Set(['www.pichau.com.br', 'www.terabyteshop.com.br', 'www.kabum.com.br', 'www.amazon.com.br', 'www.mercadolivre.com.br', 'produto.mercadolivre.com.br']);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function priceIdentity(component) {
  return createHash('sha256').update(JSON.stringify(canonical({ id: component.id, name: component.name,
    brand: component.brand, category: component.category, partNumber: component.partNumber ?? null, specs: component.specs }))).digest('hex');
}
// This is an observation admission gate, not an API authorization or future stock guarantee.
export function isVerifiedPriceObservation(record, now = Date.now()) {
  try {
    const url = new URL(record.productUrl);
    const observed = typeof record.observedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(record.observedAt)
      ? Date.parse(record.observedAt) : NaN;
    const calendarDate = typeof record.observedAt === 'string' ? record.observedAt.slice(0, 10) : '';
    const realCalendarDate = Number.isFinite(observed)
      && new Date(`${calendarDate}T00:00:00.000Z`).toISOString().slice(0, 10) === calendarDate;
    const identity = record.expectedCatalogIdentity;
    const reviewed = record.reviewedSkuMatch;
    const modelBound = typeof identity?.partNumber === 'string' && identity.partNumber === record.model
      || reviewed?.catalogProductId === record.productId && reviewed.catalogName === identity?.name
        && reviewed.catalogPartNumber === (identity?.partNumber ?? null) && reviewed.offerModel === record.model
        && typeof reviewed.evidenceUrl === 'string' && /^https:\/\//.test(reviewed.evidenceUrl)
        && typeof reviewed.reason === 'string' && reviewed.reason.trim().length > 0;
    return record.snapshotEligible === true && record.selectedStore === true && record.currency === 'BRL'
      && typeof record.price === 'number' && Number.isFinite(record.price) && record.price > 0
      && record.referenceScope === 'exact' && ['exact', 'exact_variant'].includes(record.identityMatch)
      && record.availability === 'available' && record.verificationMethod === 'rendered_product_page'
      && realCalendarDate && observed <= now && modelBound
      && typeof record.availabilityEvidence === 'string' && record.availabilityEvidence.trim().length > 0
      && record.source?.kind === 'manual_public_page_observation' && record.source.authorizedApi === false
      && record.expectedCatalogIdentity?.id === record.productId
      && typeof record.productId === 'string' && record.productId.length > 0
      && url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.username && !url.password
      && url.pathname !== '/' && !/(\/busca|\/search|\/s\/|^\/s$)/i.test(url.pathname)
      && !['q', 'k', 'query', 'search', 'str'].some(key => url.searchParams.has(key))
      && typeof record.seller === 'string' && record.seller.trim().length > 0
      && typeof record.model === 'string' && record.model.trim().length > 0;
  } catch { return false; }
}
const registry = new Map(records.filter(record => isVerifiedPriceObservation(record)).map(record => [record.productId, record]));
export const datedReferenceCount = registry.size;
export function attachDatedReference(component) {
  const record = registry.get(component.id);
  if (!record || priceIdentity(component) !== priceIdentity(record.expectedCatalogIdentity)
    || component.price !== record.demonstrativePrice) {
    const missing = { ...component, demonstrativePrice: Object.hasOwn(component, 'demonstrativePrice') ? component.demonstrativePrice : component.price, price: null, priceKind: 'unavailable', priceLabel: 'Sem cotação' };
    delete missing.datedReferenceIdentity;
    return missing;
  }
  return { ...component, demonstrativePrice: component.price, price: record.price,
    priceKind: 'dated-reference-snapshot', priceCurrency: 'BRL',
    priceLabel: 'Referência datada à vista (PIX), sem atualização em tempo real',
    datedReferenceIdentity: priceIdentity(component) };
}
export function getDatedReference(component) {
  const record = registry.get(component.id);
  if (!record || component.datedReferenceIdentity !== priceIdentity(component)
    || priceIdentity(component) !== priceIdentity(record.expectedCatalogIdentity)
    || component.price !== record.price) return null;
  const reference = { ...record };
  delete reference.expectedCatalogIdentity;
  delete reference.demonstrativePrice;
  return reference;
}
