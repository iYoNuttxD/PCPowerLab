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

export function validateUpgradeStepCount(value) {
  const steps = Number(value);
  return Number.isInteger(steps) && steps >= 1 && steps <= 5
    ? '' : 'Informe uma quantidade inteira de etapas entre 1 e 5.';
}
