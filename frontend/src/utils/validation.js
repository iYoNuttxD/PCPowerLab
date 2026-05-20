import { componentTypes } from './componentLabels.js';

export function validateBudgetAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return 'Informe um orçamento maior que zero.';
  }

  return '';
}

export function getMissingBuildSlots(selectedComponents) {
  return componentTypes.filter((type) => !selectedComponents?.[type]?.id && !selectedComponents?.[type]);
}

export function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
