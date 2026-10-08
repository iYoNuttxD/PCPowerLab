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
function safeRecord(record) {
  try {
    const url = new URL(record.productUrl);
    return record.snapshotEligible === true && record.selectedStore === true && record.currency === 'BRL'
      && typeof record.price === 'number' && Number.isFinite(record.price) && record.price > 0
      && record.availability !== 'unavailable' && record.queriedAt === '2026-10-08'
      && url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.username && !url.password
      && !/\/busca|\/search|\/s\//.test(url.pathname) && record.seller && record.model;
  } catch { return false; }
}
const registry = new Map(records.filter(safeRecord).map(record => [record.productId, record]));
export const datedReferenceCount = registry.size;
export function attachDatedReference(component) {
  const record = registry.get(component.id);
  if (!record) return { ...component, demonstrativePrice: component.price, price: null, priceKind: 'unavailable', priceLabel: 'Sem cotação' };
  if (priceIdentity(component) !== priceIdentity(record.expectedCatalogIdentity)
    || component.price !== record.demonstrativePrice) return component;
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
