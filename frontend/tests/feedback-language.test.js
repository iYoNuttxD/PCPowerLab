import test from 'node:test';
import assert from 'node:assert/strict';
import { specLabel, formatSpecValue, specKeys } from '../src/utils/componentPresentation.js';
import { translateValue, readableMessage } from '../src/utils/translations.js';
test('RAM presents transfer rate, kit count and profile in Portuguese with correct units', () => {
  assert.equal(specLabel('maximumTurboPowerWatts'), 'Potência máxima em turbo (W)');
  assert.equal(specLabel('includesCpuCooler'), 'Cooler incluído');
  assert.equal(formatSpecValue('maximumTurboPowerWatts', 253), '253');
  assert.equal(formatSpecValue('includesCpuCooler', true), 'Sim');
  assert.equal(formatSpecValue('includesCpuCooler', false), 'Não');
  assert.equal(formatSpecValue('includesCpuCooler', null), 'Não informado');
  assert.equal(specLabel('dataRateMTs'), 'Taxa de transferência');
  assert.equal(specLabel('modulesPerKit'), 'Módulos por kit');
  assert.equal(specLabel('speedProfile'), 'Perfil de velocidade');
  assert.equal(formatSpecValue('dataRateMTs', 6000), '6.000 MT/s');
});
test('all cooling pending checks and conflicts have useful Portuguese titles', () => {
  for (const code of ['CASE_GPU_LENGTH_UNVERIFIED', 'COOLER_SOCKET_UNVERIFIED', 'AIR_COOLER_CLEARANCE_UNVERIFIED', 'COOLER_HEIGHT_UNVERIFIED', 'RADIATOR_SIZE_UNVERIFIED', 'RADIATOR_CLEARANCE_UNVERIFIED', 'COOLER_TYPE_UNVERIFIED', 'FAN_DIAMETER_UNVERIFIED', 'FAN_THICKNESS_UNVERIFIED', 'FAN_CAPACITY_UNVERIFIED', 'FAN_LAYOUT_UNVERIFIED', 'FAN_CONNECTORS_UNVERIFIED', 'COOLING_POWER_UNVERIFIED', 'COOLER_CPU_SOCKET_INCOMPATIBLE', 'CASE_COOLER_HEIGHT_INCOMPATIBLE', 'CASE_RADIATOR_SIZE_INCOMPATIBLE', 'CASE_FAN_DIAMETER_INCOMPATIBLE', 'CASE_FAN_THICKNESS_INCOMPATIBLE', 'CASE_FAN_CAPACITY_EXCEEDED']) {
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


test('pending compatibility and legacy alert wording are clear Portuguese without changing identifiers', () => {
  assert.equal(translateValue('unverified_compatibility'), 'Compatibilidade pendente');
  assert.equal(translateValue('fans'), 'Ventoinhas');
  assert.equal(readableMessage('Atencao: configuracao com fans sem verificacoes.'), 'Atenção: configuração com ventoinhas sem verificações.');
  assert.equal(readableMessage('Noctua NH-U12S redux · 120 mm'), 'Noctua NH-U12S redux · 120 mm');
  assert.equal(readableMessage('Confirme o layout e os fans incluídos.'), 'Confirme o layout e as ventoinhas incluídas.');
  assert.equal(readableMessage(null), null);
});

test('replacement memory and storage descriptions are readable without changing stored technical values', () => {
  const profile = 'JEDEC DDR4-3200; no XMP needed for rated JEDEC profile';
  assert.equal(formatSpecValue('speedProfile', profile), 'JEDEC DDR4-3200; dispensa XMP para a taxa declarada');
  assert.equal(formatSpecValue('formFactor', 'M.2 2280 single-sided'), 'M.2 2280, componentes em uma face');
  assert.equal(formatSpecValue('formFactor', '2.5-inch 7mm'), '2,5 polegadas, 7 mm');
  assert.equal(formatSpecValue('speedProfile', 'Intel XMP 2.0'), 'Intel XMP 2.0');
  assert.equal(profile, 'JEDEC DDR4-3200; no XMP needed for rated JEDEC profile');
});
