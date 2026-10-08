export const componentCategories = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case',
  'cooler',
  'fan'
];

export function isValidComponentCategory(category) {
  return componentCategories.includes(category);
}

export function isNonEmptyTextArray(value) {
  return Array.isArray(value) && value.length > 0
    && value.every(entry => typeof entry === 'string' && entry.trim().length > 0);
}
