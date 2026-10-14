// Explicit current models for successful new builds. Historical saved-build
// scenarios keep their own original IDs and are never migrated by this helper.
export const currentBuildIds = Object.freeze({
  cpu: 'cpu-ryzen-5-5500',
  gpu: 'gpu-gigabyte-rx-7600-gaming-oc-8g',
  motherboard: 'mb-asus-tuf-b550m-plus',
  ram: 'ram-kf436c17bbk2-16',
  storage: 'ssd-snv3s-1000g',
  psu: 'psu-coolermaster-mwe-gold650-v3',
  case: 'case-cooler-master-elite-502-white'
});

export function activePart(catalog, id) {
  const part = catalog.find(component => component.id === id);
  if (!part || part.active === false || part.selectable === false || ['legacy', 'inactive'].includes(part.catalogStatus) || part.lifecycle === 'legacy') {
    throw new Error(`Browser fixture requires active exact model: ${id}`);
  }
  return part;
}

export function currentBuild(catalog) {
  return Object.fromEntries(Object.entries(currentBuildIds).map(([slot, id]) => [slot, activePart(catalog, id)]));
}

export const comparisonCpuIds = Object.freeze([
  'cpu-ryzen-5-5500', 'cpu-ryzen-7-5700x', 'cpu-ryzen-7-5800x3d',
  'cpu-ryzen-5-7600', 'cpu-ryzen-7-7700'
]);
