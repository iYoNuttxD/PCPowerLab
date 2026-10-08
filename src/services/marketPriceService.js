import { getDatedReference } from '../data/dated-price-references.js';
import { URL } from 'node:url';
// No live provider is configured. Manual observations are not authorized API quotes.
// Catalog prices remain estimates and are never replaced by a partial market subtotal.
export const marketIntegrationStatus = Object.freeze({ status: 'not_configured', connected: false,
  message: 'Comparação automática indisponível: nenhuma fonte de preços autorizada está conectada.' });
export const marketQuotes = Object.freeze([]);

export function referencePrice(component) {
  const snapshot = getDatedReference(component);
  if (snapshot) return { ...snapshot, observationSource: snapshot.source, source: 'dated_public_reference', updateStatus: 'dated_snapshot',
    isMarketQuote: false, basis: 'PIX à vista; frete excluído', observedAvailability: snapshot.availability,
    availability: 'unknown', validUntil: null, validityMessage: 'Registro de pesquisa datado; sem validade futura ou estoque ao vivo' };
  return { productId: component.id, price: component.priceKind !== 'dated-reference-snapshot' && !component.datedReferenceIdentity && validPrice(component.price) ? component.price : null,
    currency: 'BRL', source: 'catalog_reference', updateStatus: 'estimate', queriedAt: null,
    validUntil: null, availability: 'unknown', isMarketQuote: false };
}

function validPrice(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
function dateValue(value) { return typeof value === 'string' ? Date.parse(value) : NaN; }
function productUrl(value, allowedHosts) {
  try {
    const url = new URL(value);
    return Array.isArray(allowedHosts) && allowedHosts.includes(url.hostname)
      && url.protocol === 'https:' && !url.username && !url.password
      && url.pathname !== '/' && !/(\/search|\/busca|\/s\/|^\/s$)/i.test(url.pathname)
      && !url.hostname.startsWith('lista.') && !['q', 'k', 'query', 'search', 'str'].some(key => url.searchParams.has(key));
  } catch { return false; }
}

// Trust is assigned by a future server-side provider, never from request bodies.
export function assessMarketQuote(quote, productId, now = Date.now()) {
  if (!quote || typeof quote !== 'object') return { status: 'invalid', quote: null };
  if (quote.updateStatus === 'source_error') return { status: 'source_error', quote };
  if (quote.source?.kind === 'mock' || quote.updateStatus === 'estimate') return { status: 'mock', quote };
  const queried = dateValue(quote.queriedAt), until = dateValue(quote.validUntil);
  if (quote.productId !== productId || !quote.storeId || !quote.storeName || !productUrl(quote.productUrl, quote.source?.productHosts)
    || !quote.externalProductId || quote.identityVerified !== true
    || !validPrice(quote.price) || quote.currency !== 'BRL' || quote.source?.authorized !== true
    || !quote.source?.name || !quote.source?.reference || quote.source?.kind !== 'authorized_api'
    || quote.updateStatus !== 'success' || !Number.isFinite(queried) || !Number.isFinite(until)
    || queried > now || until <= queried || !['available', 'unavailable', 'unknown'].includes(quote.availability)) {
    return { status: 'invalid', quote };
  }
  if (until <= now) return { status: 'stale', quote };
  if (quote.availability === 'unavailable') return { status: 'unavailable', quote };
  if (quote.availability !== 'available') return { status: 'unknown_availability', quote };
  return { status: 'valid', quote };
}

export function getProductMarket(productId, quotes = marketQuotes, now = Date.now()) {
  const assessments = quotes.filter(quote => quote?.productId === productId)
    .map(quote => assessMarketQuote(quote, productId, now));
  // Keep newest observation per seller; a later failure/unavailability invalidates an older quote.
  const latest = new Map();
  for (const item of assessments) {
    const key = item.quote?.storeId;
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || (dateValue(item.quote.queriedAt) || 0) >= (dateValue(previous.quote.queriedAt) || 0)) latest.set(key, item);
  }
  const offers = [...latest.values()].filter(item => item.status === 'valid').map(item => item.quote)
    .sort((a, b) => a.price - b.price || a.storeId.localeCompare(b.storeId));
  return { productId, offers, rejected: assessments.filter(item => item.status !== 'valid').map(item => ({
    storeId: item.quote?.storeId || null, status: item.status })),
    comparisonAvailable: offers.length >= 2, status: offers.length >= 2 ? 'multiple_stores' : offers.length === 1 ? 'single_store' : 'no_current_quote',
    message: offers.length >= 2 ? 'Preços das cotações válidas recebidas, em ordem crescente; não cobre todo o mercado nem inclui frete.'
      : offers.length === 1 ? 'Uma única loja com cotação válida; comparação entre lojas indisponível.' : marketIntegrationStatus.message };
}

export function summarizeBuildPricing(build, quotes = marketQuotes, now = Date.now()) {
  const entries = Object.entries(build).flatMap(([slot, value]) => slot === 'fans'
    ? (value || []).map(fan => ({ component: fan, quantity: fan.quantity }))
    : value && typeof value === 'object' && value.id ? [{ component: value, quantity: 1 }] : []);
  let estimated = 0, availableQuotes = 0, datedReferenceUnits = 0, estimatedReferenceUnits = 0, unavailableReferenceUnits = 0;
  const referenceComponents = [];
  const withoutReference = [], withoutQuote = [], quotedComponents = [];
  for (const { component, quantity } of entries) {
    const reference = referencePrice(component);
    if (reference.price === null) unavailableReferenceUnits += quantity;
    else if (reference.updateStatus === 'dated_snapshot') datedReferenceUnits += quantity;
    else estimatedReferenceUnits += quantity;
    referenceComponents.push({ productId: component.id, quantity, price: reference.price,
      basis: reference.updateStatus, store: reference.store ?? null, queriedAt: reference.queriedAt,
      observedAt: reference.observedAt ?? null, observedAvailability: reference.observedAvailability ?? 'unknown' });
    if (reference.price === null) withoutReference.push(component.id);
    else estimated += reference.price * quantity;
    const offer = getProductMarket(component.id, quotes, now).offers.find(item => item.availability === 'available');
    if (!offer) withoutQuote.push(component.id);
    else {
      availableQuotes += offer.price * quantity;
      quotedComponents.push({ productId: component.id, quantity, ...offer });
    }
  }
  return { currency: 'BRL', estimatedTotal: !entries.length || withoutReference.length ? null : Number(estimated.toFixed(2)),
    knownReferenceSubtotal: Number(estimated.toFixed(2)),
    observedAvailableReferenceTotal: entries.length > 0 && !withoutReference.length && estimatedReferenceUnits === 0 ? Number(estimated.toFixed(2)) : null,
    componentsWithoutVerifiedObservation: referenceComponents.filter(item => item.basis !== 'dated_snapshot' || item.price === null).map(item => item.productId),
    referenceTotalComplete: entries.length > 0 && withoutReference.length === 0,
    availableMarketQuotesTotal: entries.length > 0 && withoutQuote.length === 0 ? Number(availableQuotes.toFixed(2)) : null,
    availableMarketQuotesSubtotal: quotedComponents.length ? Number(availableQuotes.toFixed(2)) : null,
    marketTotalComplete: entries.length > 0 && withoutQuote.length === 0,
    componentsWithoutCurrentQuote: withoutQuote, componentsWithoutReference: withoutReference, quotedComponents,
    basis: datedReferenceUnits ? (estimatedReferenceUnits ? 'mixed_dated_and_estimated_reference' : 'dated_reference') : 'catalog_reference',
    datedReferenceUnits, estimatedReferenceUnits, unavailableReferenceUnits, referenceComponents, paymentBasis: 'Referências datadas: PIX à vista; demais valores: estimativas sem condição de pagamento verificada', excludesShipping: true,
    methodology: 'Total estimado usa referências observadas de SKU exato com disponibilidade explícita e pode incluir estimativas administrativas identificadas. Total de referências com disponibilidade observada exige cobertura completa e exclui estimativas. A observação é manual e datada, sem garantia futura de preço ou estoque e sem API conectada. Cotações autorizadas são separadas: cobertura parcial aparece somente no subtotal. Frete e montagem não incluídos.' };
}
