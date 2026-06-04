import test from 'node:test';
import assert from 'node:assert/strict';

import { suggestCompatibilityFixes } from '../src/services/compatibilityFixService.js';

const validBuild = {
  cpuId: 'cpu-ryzen-5-5600',
  motherboardId: 'mb-b550m-aorus-elite',
  gpuId: 'gpu-rtx-4060',
  ramId: 'ram-kingston-fury-16gb-ddr4',
  storageId: 'ssd-kingston-nv2-1tb',
  psuId: 'psu-corsair-650w',
  caseId: 'case-mid-tower-airflow'
};

test('deve sugerir placa-mae compativel para incompatibilidade de socket', () => {
  const result = suggestCompatibilityFixes({
    ...validBuild,
    motherboardId: 'mb-h610m-ddr4'
  });

  assert.equal(result.compatible, false);
  assert.equal(result.issues.some((issue) => issue.type === 'socket_mismatch'), true);

  const socketSuggestion = result.suggestions.find((suggestion) => (
    suggestion.problem === 'socket_mismatch' && suggestion.replaceComponent === 'motherboard'
  ));

  assert.equal(Boolean(socketSuggestion), true);
  assert.equal(socketSuggestion.suggestedComponents.length <= 3, true);
  assert.equal(
    socketSuggestion.suggestedComponents.every(({ component }) => component.specs.socket === 'AM4'),
    true
  );
  assert.equal(typeof socketSuggestion.suggestedComponents[0].reason, 'string');
});

test('deve sugerir fonte com potencia suficiente', () => {
  const result = suggestCompatibilityFixes({
    ...validBuild,
    gpuId: 'gpu-rx-7800-xt',
    psuId: 'psu-corsair-650w'
  });

  const psuSuggestion = result.suggestions.find((suggestion) => (
    suggestion.problem === 'psu_insufficient' && suggestion.replaceComponent === 'psu'
  ));

  assert.equal(Boolean(psuSuggestion), true);
  assert.equal(
    psuSuggestion.suggestedComponents.every(({ component }) => component.specs.watts >= 750),
    true
  );
});

test('deve retornar sugestoes vazias quando a build ja for compativel', () => {
  const result = suggestCompatibilityFixes(validBuild);

  assert.equal(result.compatible, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.suggestions, []);
});
