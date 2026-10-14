import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { components } from '../../src/data/components.mock.js';
import { performanceParameters } from '../../src/data/performanceParameters.js';

// Deliberate, explicit current choices. This is not a replacement resolver.
// Fit/BIOS/performance unknowns on these real models must remain unknown.
export const currentBuild = Object.freeze({
  cpuId: 'cpu-ryzen-5-5500',
  motherboardId: 'mb-asus-tuf-b550m-plus',
  gpuId: 'gpu-msi-rtx-4060-ventus-2x-black-8g-oc',
  ramId: 'ram-kf432c16bbk2-16',
  storageId: 'ssd-kingston-nv3-500gb',
  psuId: 'psu-coolermaster-mwe-gold650-v3',
  caseId: 'case-cooler-master-elite-502-white'
});
export const currentBuildSlots = Object.freeze(Object.fromEntries(
  Object.entries(currentBuild).map(([key, id]) => [key.replace(/Id$/, ''), id])
));
const currentFacts = JSON.parse(readFileSync(new URL('../fixtures/current-market-source-facts.json', import.meta.url), 'utf8'));
export function currentBuildTotal(overrides = {}) {
  return Object.values({ ...currentBuildSlots, ...overrides }).reduce((cents, id) => {
    const fact = currentFacts[id];
    if (!Number.isFinite(fact?.price)) throw new Error(`Missing independent current price fact: ${id}`);
    return cents + Math.round(fact.price * 100);
  }, 0) / 100;
}
export function currentPrice(id) { return currentFacts[id].price; }

// Independent artificial scenario for algorithm coverage that needs completely
// known fit and performance. These IDs are not products, replacements, quotes,
// or evidence that any real current model has these capabilities.
export const scenarioBuild = Object.freeze({
  cpuId: 'test-scenario-cpu-am4', motherboardId: 'test-scenario-board-am4',
  gpuId: 'test-scenario-gpu-balanced', ramId: 'test-scenario-ram-ddr4',
  storageId: 'test-scenario-storage-nvme', psuId: 'test-scenario-psu', caseId: 'test-scenario-case'
});
export const scenarioBuildSlots = Object.freeze(Object.fromEntries(
  Object.entries(scenarioBuild).map(([key, id]) => [key.replace(/Id$/, ''), id])
));
export const scenarioPrices = Object.freeze({
  [scenarioBuild.cpuId]: 900, [scenarioBuild.motherboardId]: 700,
  [scenarioBuild.gpuId]: 2200, [scenarioBuild.ramId]: 1800,
  [scenarioBuild.storageId]: 500, [scenarioBuild.psuId]: 450,
  [scenarioBuild.caseId]: 450, 'test-scenario-gpu-value': 2100,
  'test-scenario-gpu-premium': 6000, 'test-scenario-cpu-intel': 830,
  'test-scenario-board-intel': 490
});
export function scenarioBuildTotal(overrides = {}) {
  return Object.values({ ...scenarioBuildSlots, ...overrides }).reduce((sum, id) => {
    if (!Number.isFinite(scenarioPrices[id])) throw new Error(`Missing scenario price: ${id}`);
    return sum + scenarioPrices[id];
  }, 0);
}
export function installScenarioBuild() {
  const specs = {
    cpu: { socket: 'AM4', cores: 6, threads: 12, baseClockGhz: 3.5, boostClockGhz: 4.4, tdpWatts: 65 },
    motherboard: { socket: 'AM4', memoryType: 'DDR4', formFactor: 'mATX', chipset: 'Test', storageInterfaces: ['M.2 NVMe', 'SATA'], memorySlots: 4, maxMemoryGb: 128, m2SupportedLengthsMm: [80] },
    gpu: { vramGb: 8, tdpWatts: 115, recommendedPsuWatts: 550, lengthMm: 240, powerConnectors: [{ type: 'pcie-8pin', count: 1 }] },
    ram: { memoryType: 'DDR4', capacityGb: 16, speedMhz: 3200, modulesPerKit: 2 },
    storage: { interface: 'M.2 NVMe', storageType: 'SSD', capacityGb: 1000, readSpeedMbS: 3500, writeSpeedMbS: 2100 },
    psu: { watts: 650, efficiency: 'Test', formFactor: 'ATX', dimensionsMm: { length: 140 }, pcie8PinConnectors: 2, native12v2x6Connectors: 0 },
    case: { supportedFormFactors: ['ATX', 'mATX', 'ITX'], maxGpuLengthMm: 320, supportedPsuFormFactors: ['ATX'], maxPsuLengthMm: 180 }
  };
  const scores = {
    cpu: { performanceScore: 70, gamingScore: 72, productivityScore: 68, tdp: 65, cores: 6, threads: 12 },
    gpu: { performanceScore: 76, gamingScore: 80, productivityScore: 65, vram: 8, tdp: 115 },
    ram: { performanceScore: 60, gamingScore: 62, productivityScore: 60, capacity: 16, speed: 3200, memoryType: 'DDR4' },
    storage: { performanceScore: 65, gamingScore: 66, productivityScore: 64, capacity: 1000, interface: 'M.2 NVMe', readSpeed: 3500, writeSpeed: 2100 },
    motherboard: { performanceScore: 74, socket: 'AM4', memoryType: 'DDR4', formFactor: 'mATX' },
    psu: { performanceScore: 75, wattage: 650, efficiency: 'Test' },
    case: { performanceScore: 78, airflowScore: 82, maxGpuLength: 320, formFactorSupport: ['ATX', 'mATX', 'ITX'] }
  };
  const add = (id, category, technical, performance) => {
    if (components.some(part => part.id === id)) return;
    components.push({ id, name: `Synthetic ${id}`, category, brand: 'Test only', active: true,
      price: scenarioPrices[id], specs: globalThis.structuredClone(technical) });
    if (performance) performanceParameters.push({ componentId: id, type: category,
      simulationSupported: true, simulationProfileVersion: 'test-fixture-simulator-v1',
      recommendedUse: ['gaming', 'general', 'programming'], ...performance });
  };
  for (const [slot, id] of Object.entries(scenarioBuildSlots)) add(id, slot, specs[slot], scores[slot]);
  add('test-scenario-gpu-value', 'gpu', { ...specs.gpu, tdpWatts: 165, lengthMm: 235 }, { ...scores.gpu, performanceScore: 72, gamingScore: 76, productivityScore: 58, tdp: 165 });
  add('test-scenario-gpu-premium', 'gpu', { ...specs.gpu, vramGb: 12, tdpWatts: 200, recommendedPsuWatts: 650, lengthMm: 270 }, { ...scores.gpu, performanceScore: 90, gamingScore: 92, productivityScore: 82, vram: 12, tdp: 200 });
  add('test-scenario-cpu-intel', 'cpu', { ...specs.cpu, socket: 'LGA1700' }, { ...scores.cpu, performanceScore: 72, gamingScore: 74, productivityScore: 70 });
  add('test-scenario-board-intel', 'motherboard', { ...specs.motherboard, socket: 'LGA1700' });
}
