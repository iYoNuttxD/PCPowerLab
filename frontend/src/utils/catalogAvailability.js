// Legacy records are resolvable history, never new catalog choices.
export function isSelectableComponent(component) {
  return Boolean(component?.id) && component.active !== false && component.selectable !== false
    && !['legacy', 'inactive'].includes(component.catalogStatus);
}

export function catalogView(records = []) {
  const allComponents = records.filter(component => isSelectableComponent(component) || component.catalogStatus === 'legacy');
  return {
    allComponents,
    components: allComponents.filter(isSelectableComponent),
    componentMap: Object.fromEntries(allComponents.map(component => [component.id, component]))
  };
}

export function suggestedReplacement(component, componentMap = {}) {
  if (component?.catalogStatus !== 'legacy' || !component.replacementId) return null;
  const replacement = componentMap[component.replacementId];
  return isSelectableComponent(replacement) && replacement.category === component.category ? replacement : null;
}
