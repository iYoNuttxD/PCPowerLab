import { componentCategories } from './component.model.js';

export const compatibilityRuleOperators = [
  'equals',
  'includes',
  'lessThanOrEqual',
  'greaterThanOrEqual'
];

export const compatibilityRuleSeverities = [
  'low',
  'medium',
  'high'
];

export const compatibilityRuleComponentTypes = [
  ...componentCategories,
  'build'
];

export function isValidCompatibilityRuleOperator(operator) {
  return compatibilityRuleOperators.includes(operator);
}

export function isValidCompatibilityRuleSeverity(severity) {
  return compatibilityRuleSeverities.includes(severity);
}

export function isValidCompatibilityRuleComponentType(componentType) {
  return compatibilityRuleComponentTypes.includes(componentType);
}
