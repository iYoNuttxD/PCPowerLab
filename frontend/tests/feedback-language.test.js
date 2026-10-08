import test from 'node:test';
import assert from 'node:assert/strict';
import { specLabel, formatSpecValue, specKeys } from '../src/utils/componentPresentation.js';
import { translateValue } from '../src/utils/translations.js';
test('RAM presents transfer rate, kit count and profile in Portuguese with correct units', () => {
  assert.equal(specLabel('dataRateMTs'), 'Taxa de transferência');
  assert.equal(specLabel('modulesPerKit'), 'Módulos por kit');
  assert.equal(specLabel('speedProfile'), 'Perfil de velocidade');
  assert.equal(formatSpecValue('dataRateMTs', 6000), '6.000 MT/s');
});
test('all cooling pending checks and conflicts have useful Portuguese titles', () => {
  for (const code of ['COOLER_SOCKET_UNVERIFIED', 'AIR_COOLER_CLEARANCE_UNVERIFIED', 'COOLER_HEIGHT_UNVERIFIED', 'RADIATOR_SIZE_UNVERIFIED', 'RADIATOR_CLEARANCE_UNVERIFIED', 'COOLER_TYPE_UNVERIFIED', 'FAN_DIAMETER_UNVERIFIED', 'FAN_THICKNESS_UNVERIFIED', 'FAN_CAPACITY_UNVERIFIED', 'FAN_LAYOUT_UNVERIFIED', 'FAN_CONNECTORS_UNVERIFIED', 'COOLING_POWER_UNVERIFIED', 'COOLER_CPU_SOCKET_INCOMPATIBLE', 'CASE_COOLER_HEIGHT_INCOMPATIBLE', 'CASE_RADIATOR_SIZE_INCOMPATIBLE', 'CASE_FAN_DIAMETER_INCOMPATIBLE', 'CASE_FAN_THICKNESS_INCOMPATIBLE', 'CASE_FAN_CAPACITY_EXCEEDED']) {
    assert(!/[A-Z]{3,} [A-Z]{3,}/.test(translateValue(code)), code);
    assert.notEqual(translateValue(code), code.replaceAll('_',' '));
  }
});

test('equivalent RAM rate aliases display once without concealing divergent or sole values', () => {
 const ram = specs => ({category:'ram',specs});
 assert.equal(specKeys([ram({speedMhz:3200,dataRateMTs:3200})]).includes('dataRateMTs'),false);
 assert.equal(specKeys([ram({dataRateMTs:3200})]).includes('dataRateMTs'),true);
 assert.equal(specKeys([ram({speedMhz:3200,dataRateMTs:3600})]).includes('dataRateMTs'),true);
});
