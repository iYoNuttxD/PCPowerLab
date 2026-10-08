import { findComponentById } from '../../src/services/component.service.js';
const ids = { cpu: 'cpu-ryzen-5-5600', motherboard: 'mb-b550m-aorus-elite', gpu: 'gpu-rtx-4060',
  ram: 'ram-kingston-fury-16gb-ddr4', storage: 'ssd-kingston-nv2-1tb', psu: 'psu-corsair-650w', case: 'case-mid-tower-airflow' };
// Independent integer-centavo expectation, from the live fixture's chosen catalog records.
export function referenceFixtureTotal(overrides = {}) {
  return Object.values({ ...ids, ...overrides }).reduce((cents, id) => cents + Math.round(findComponentById(id).price * 100), 0) / 100;
}
export function referenceFixtureCoolingTotal() {
  return Math.round((referenceFixtureTotal() + findComponentById('cooler-noctua-nh-u12s-redux').price
    + findComponentById('fan-arctic-p12-pwm-pst-5-pack').price * 2) * 100) / 100;
}
