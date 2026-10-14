import { components } from './components.mock.js';

const lastUpdated = null;

const stores = [
  {
    storeName: 'Kabum',
    buildUrl: ({ hyphenTerm }) => `https://www.kabum.com.br/busca/${hyphenTerm}`
  },
  {
    storeName: 'Pichau',
    buildUrl: ({ encodedTerm }) => `https://www.pichau.com.br/search?q=${encodedTerm}`
  },
  {
    storeName: 'Terabyte',
    buildUrl: ({ encodedTerm }) => `https://www.terabyteshop.com.br/busca?str=${encodedTerm}`
  },
  {
    storeName: 'Amazon Brasil',
    buildUrl: ({ encodedTerm }) => `https://www.amazon.com.br/s?k=${encodedTerm}`
  },
  {
    storeName: 'Mercado Livre',
    buildUrl: ({ hyphenTerm }) => `https://lista.mercadolivre.com.br/${hyphenTerm}`
  }
];

export const purchaseLinks = components.flatMap(createComponentPurchaseLinks);

export function createComponentPurchaseLinks(component) {
  const searchTerm = buildSearchTerm(component);
  const terms = {
    hyphenTerm: toHyphenTerm(searchTerm),
    encodedTerm: encodeURIComponent(searchTerm.toLowerCase())
  };

  return stores.map((store) => ({
    componentId: component.id,
    productId: component.id,
    storeId: toHyphenTerm(store.storeName),
    kind: 'research',
    priceType: 'estimate',
    productUrl: null,
    queriedAt: null,
    validUntil: null,
    source: { kind: 'catalog_reference', name: 'Catálogo demonstrativo' },
    updateStatus: 'not_queried',
    storeName: store.storeName,
    url: store.buildUrl(terms),
    price: Number.isFinite(component.price) ? component.price : null,
    currency: 'BRL',
    lastUpdated,
    isAffiliate: false,
    availabilityStatus: 'unknown'
  }));
}

function buildSearchTerm(component) {
  const name = component.name || component.id;

  if (component.category === 'cpu') {
    return name
      .replace(/^AMD\s+/i, '')
      .replace(/^Intel\s+/i, '');
  }

  if (component.category === 'gpu') {
    return name
      .replace(/^NVIDIA\s+GeForce\s+/i, '')
      .replace(/^AMD\s+Radeon\s+/i, '');
  }

  return name;
}

function toHyphenTerm(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
