const lastUpdated = '2026-05-20';

const linkSeeds = [
  ['cpu-ryzen-5-5500', 589.9, ['Kabum']],
  ['cpu-ryzen-5-5600', 799.9, ['Kabum', 'Pichau']],
  ['cpu-ryzen-7-5700x', 1199.9, ['Terabyte']],
  ['cpu-ryzen-7-5800x3d', 1899.9, ['Kabum']],
  ['cpu-ryzen-5-7600', 1399.9, ['Amazon Brasil']],
  ['cpu-ryzen-7-7700', 1999.9, ['Pichau']],
  ['cpu-intel-i3-12100f', 549.9, ['Mercado Livre']],
  ['cpu-intel-i5-12400f', 849.9, ['Kabum', 'Terabyte']],
  ['cpu-intel-i5-13400f', 1199.9, ['Pichau']],
  ['cpu-intel-i5-13600k', 1899.9, ['Kabum']],
  ['cpu-intel-i7-13700k', 2699.9, ['Terabyte']],
  ['cpu-intel-i5-14400f', 1299.9, ['Amazon Brasil']],
  ['mb-b550m-aorus-elite', 699.9, ['Kabum', 'Pichau']],
  ['mb-asus-tuf-b550m-plus', 899.9, ['Terabyte']],
  ['mb-msi-b550-tomahawk', 1099.9, ['Kabum']],
  ['mb-asus-prime-b650m-a', 1199.9, ['Pichau']],
  ['mb-gigabyte-b650-gaming-x-ax', 1499.9, ['Terabyte']],
  ['mb-h610m-ddr4', 589.9, ['Amazon Brasil']],
  ['mb-msi-pro-b660m-a-ddr4', 799.9, ['Kabum']],
  ['mb-gigabyte-b760m-ds3h-ddr4', 949.9, ['Pichau']],
  ['mb-asus-tuf-z790-plus-ddr5', 2199.9, ['Kabum']],
  ['gpu-gtx-1650', 799.9, ['Mercado Livre']],
  ['gpu-rtx-3050', 1299.9, ['Pichau']],
  ['gpu-rtx-3060', 1599.9, ['Terabyte']],
  ['gpu-rtx-4060', 1899.9, ['Pichau', 'Kabum']],
  ['gpu-rtx-4060-ti', 2499.9, ['Kabum']],
  ['gpu-rtx-4070', 3899.9, ['Terabyte']],
  ['gpu-rtx-4070-super', 4499.9, ['Pichau']],
  ['gpu-rx-6600', 1199.9, ['Kabum']],
  ['gpu-rx-7600', 1699.9, ['Terabyte', 'Amazon Brasil']],
  ['gpu-rx-7700-xt', 3299.9, ['Pichau']],
  ['gpu-rx-7800-xt', 3999.9, ['Kabum']],
  ['ram-kingston-fury-8gb-ddr4', 149.9, ['Mercado Livre']],
  ['ram-kingston-fury-16gb-ddr4', 249.9, ['Terabyte', 'Kabum']],
  ['ram-kingston-fury-32gb-ddr4', 499.9, ['Pichau']],
  ['ram-corsair-vengeance-16gb-ddr4-3600', 289.9, ['Amazon Brasil']],
  ['ram-corsair-vengeance-16gb-ddr5', 399.9, ['Kabum']],
  ['ram-corsair-vengeance-32gb-ddr5-5600', 749.9, ['Terabyte']],
  ['ram-kingston-fury-16gb-ddr5-6000', 449.9, ['Pichau']],
  ['ram-gskill-trident-z5-32gb-ddr5-6000', 899.9, ['Kabum']],
  ['ssd-kingston-a400-480gb', 189.9, ['Amazon Brasil']],
  ['ssd-kingston-nv2-500gb', 239.9, ['Mercado Livre']],
  ['ssd-kingston-nv2-1tb', 349.9, ['Kabum', 'Terabyte']],
  ['ssd-wd-blue-sn570-1tb', 399.9, ['Pichau']],
  ['ssd-wd-black-sn770-1tb', 549.9, ['Kabum']],
  ['ssd-samsung-970-evo-plus-1tb', 599.9, ['Amazon Brasil']],
  ['ssd-samsung-980-pro-2tb', 1199.9, ['Terabyte']],
  ['hdd-seagate-barracuda-2tb', 299.9, ['Mercado Livre']],
  ['psu-generic-400w', 129.9, ['Mercado Livre']],
  ['psu-corsair-cv550', 329.9, ['Kabum']],
  ['psu-corsair-650w', 399.9, ['Pichau', 'Kabum']],
  ['psu-cooler-master-mwe-650w', 449.9, ['Terabyte']],
  ['psu-xpg-pylon-650w', 429.9, ['Pichau']],
  ['psu-corsair-rm750e', 699.9, ['Kabum']],
  ['psu-xpg-core-reactor-850w', 799.9, ['Terabyte']],
  ['psu-corsair-rm850x', 899.9, ['Amazon Brasil']],
  ['case-mid-tower-airflow', 299.9, ['Kabum']],
  ['case-cooler-master-q300l', 349.9, ['Pichau']],
  ['case-nzxt-h5-flow', 649.9, ['Terabyte']],
  ['case-corsair-4000d-airflow', 699.9, ['Kabum']],
  ['case-montech-air-903-base', 399.9, ['Pichau']],
  ['case-compact-matx', 219.9, ['Mercado Livre']],
  ['case-gamer-atx-rgb', 459.9, ['Amazon Brasil']]
];

export const purchaseLinks = linkSeeds.flatMap(([componentId, basePrice, stores], componentIndex) => (
  stores.map((storeName, storeIndex) => ({
    componentId,
    storeName,
    url: `https://example.com/${slugify(storeName)}/${componentId}`,
    price: Number((basePrice * (1 + (storeIndex * 0.025))).toFixed(2)),
    currency: 'BRL',
    lastUpdated,
    isAffiliate: false,
    availabilityStatus: getAvailabilityStatus(componentIndex, storeIndex)
  }))
));

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getAvailabilityStatus(componentIndex, storeIndex) {
  if ((componentIndex + storeIndex) % 17 === 0) {
    return 'unavailable';
  }

  if ((componentIndex + storeIndex) % 11 === 0) {
    return 'unknown';
  }

  return 'available';
}
