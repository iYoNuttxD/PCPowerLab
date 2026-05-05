export const componentCategories = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case'
];

export function isValidComponentCategory(category) {
  return componentCategories.includes(category);
}
