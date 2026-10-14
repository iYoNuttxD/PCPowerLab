import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
const facts = JSON.parse(readFileSync(new URL('./approved-price-facts.json', import.meta.url), 'utf8'));
const ids = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060',
  ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
// Frozen reviewed source facts, independent of mutable application data and calculations.
export function referenceFixtureTotal(overrides = {}) {
  return Object.values({ ...ids, ...overrides }).reduce((cents, id) => {
    if (!facts[id] || !Number.isFinite(facts[id].price)) throw new Error(`Missing reviewed price fact: ${id}`);
    return cents + Math.round(facts[id].price * 100);
  }, 0) / 100;
}
