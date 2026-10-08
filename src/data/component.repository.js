import { priceIdentity } from './dated-price-references.js';
import { componentImageIdentity, unavailableComponentImage } from './component-images.js';
import { components } from './components.mock.js';

export function listComponentRecords(options = {}) {
  const includeInactive = options.includeInactive === true;

  return components.filter((component) => includeInactive || component.active !== false);
}

export function findComponentRecordById(componentId, options = {}) {
  return listComponentRecords(options).find((component) => component.id === componentId) || null;
}

export function addComponentRecord(component) {
  component.image = unavailableComponentImage(component);
  components.push(component);

  return component;
}

export function updateComponentRecord(componentId, componentData) {
  const componentIndex = components.findIndex((component) => component.id === componentId);

  if (componentIndex === -1) {
    return null;
  }

  const previous = components[componentIndex];
  components[componentIndex] = {
    ...components[componentIndex],
    ...componentData,
    id: componentId,
    image: previous.image
  };

  if (componentImageIdentity(previous) !== componentImageIdentity(components[componentIndex])) {
    components[componentIndex].image = unavailableComponentImage(components[componentIndex], 'Modelo ou variante alterado: a fotografia anterior não comprova o novo produto; revalidar identidade, fonte e licença.');
  }

  const identityChanged = priceIdentity(previous) !== priceIdentity(components[componentIndex]);
  if (identityChanged || previous.price !== components[componentIndex].price) {
    delete components[componentIndex].datedReferenceIdentity;
    delete components[componentIndex].demonstrativePrice;
    components[componentIndex].priceKind = 'estimated-reference';
    components[componentIndex].priceLabel = 'Estimativa cadastrada, sem fonte datada validada';
    // An unchanged old amount cannot price a newly identified product.
    if (identityChanged && previous.price === components[componentIndex].price) components[componentIndex].price = null;
  }
  return components[componentIndex];
}

export function deactivateComponentRecord(componentId) {
  return updateComponentRecord(componentId, { active: false });
}
