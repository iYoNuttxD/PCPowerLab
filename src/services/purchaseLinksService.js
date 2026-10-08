import { createComponentPurchaseLinks } from '../data/purchaseLinks.js';
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

  return createComponentPurchaseLinks(component).map(formatPurchaseLink);
}

export function getPurchaseLinksByBuild(buildInput) {
  const build = selectBuildComponents(buildInput);

  const links = requiredBuildSlots.reduce((linksBySlot, slot) => ({
    ...linksBySlot,
    [slot]: getPurchaseLinksByComponentId(build[slot].id)
  }), {});
  if (build.cooler) links.cooler = getPurchaseLinksByComponentId(build.cooler.id);
  if (build.fans?.length) links.fans = build.fans.flatMap((fan) =>
    getPurchaseLinksByComponentId(fan.id).map((link) => ({ ...link, quantity: fan.quantity })));
  return links;
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