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
