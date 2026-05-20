import { purchaseLinks } from '../data/purchaseLinks.js';
import { requiredBuildSlots, selectBuildComponents } from './build.service.js';
import { findComponentById } from './component.service.js';

export function getPurchaseLinksByComponentId(componentIdInput) {
  const componentId = normalizeRequiredComponentId(componentIdInput);
  const component = findComponentById(componentId);

  if (!component) {
    const error = new Error('Componente nao encontrado para links de compra.');
    error.statusCode = 404;
    error.errors = [`Componente nao encontrado: ${componentId}.`];
    throw error;
  }

  return purchaseLinks
    .filter((purchaseLink) => purchaseLink.componentId === component.id)
    .map(formatPurchaseLink);
}

export function getPurchaseLinksByBuild(buildInput) {
  const build = selectBuildComponents(buildInput);

  return requiredBuildSlots.reduce((linksBySlot, slot) => ({
    ...linksBySlot,
    [slot]: getPurchaseLinksByComponentId(build[slot].id)
  }), {});
}

function formatPurchaseLink(purchaseLink) {
  return {
    componentId: purchaseLink.componentId,
    storeName: purchaseLink.storeName,
    url: purchaseLink.url,
    price: purchaseLink.price,
    currency: purchaseLink.currency,
    lastUpdated: purchaseLink.lastUpdated,
    isAffiliate: purchaseLink.isAffiliate,
    availabilityStatus: purchaseLink.availabilityStatus
  };
}

function normalizeRequiredComponentId(componentIdInput) {
  if (typeof componentIdInput !== 'string' || componentIdInput.trim().length === 0) {
    const error = new Error('Informe o componente para consultar links de compra.');
    error.statusCode = 400;
    error.errors = ['componentId deve ser informado.'];
    throw error;
  }

  return componentIdInput.trim();
}