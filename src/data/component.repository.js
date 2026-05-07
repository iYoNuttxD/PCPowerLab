import { components } from './components.mock.js';

export function listComponentRecords(options = {}) {
  const includeInactive = options.includeInactive === true;

  return components.filter((component) => includeInactive || component.active !== false);
}

export function findComponentRecordById(componentId, options = {}) {
  return listComponentRecords(options).find((component) => component.id === componentId) || null;
}

export function addComponentRecord(component) {
  components.push(component);

  return component;
}

export function updateComponentRecord(componentId, componentData) {
  const componentIndex = components.findIndex((component) => component.id === componentId);

  if (componentIndex === -1) {
    return null;
  }

  components[componentIndex] = {
    ...components[componentIndex],
    ...componentData,
    id: componentId
  };

  return components[componentIndex];
}

export function deactivateComponentRecord(componentId) {
  return updateComponentRecord(componentId, { active: false });
}
