import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearAnalysisHistoryForTests,
  createAnalysisHistoryRecord,
  deleteAnalysisHistoryRecord,
  getAnalysisHistoryById,
  listAnalysisHistory
} from '../src/services/analysisHistoryService.js';

const validAnalysisHistoryInput = {
  buildId: 'build-001',
  analysisType: 'compatibility',
  input: {
    cpuId: 'cpu-ryzen-5-5600',
    gpuId: 'gpu-rtx-4060',
    motherboardId: 'mb-b550m-aorus-elite',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  },
  result: {
    compatible: true
  }
};

test('deve registrar historico de analise', () => {
  clearAnalysisHistoryForTests();

  const record = createAnalysisHistoryRecord(validAnalysisHistoryInput);

  assert.equal(record.id, 'analysis-001');
  assert.equal(record.buildId, 'build-001');
  assert.equal(record.analysisType, 'compatibility');
  assert.deepEqual(record.input, validAnalysisHistoryInput.input);
  assert.deepEqual(record.result, validAnalysisHistoryInput.result);
  assert.equal(Boolean(record.createdAt), true);
});

test('deve listar historico de analises', () => {
  clearAnalysisHistoryForTests();
  createAnalysisHistoryRecord(validAnalysisHistoryInput);
  createAnalysisHistoryRecord({
    ...validAnalysisHistoryInput,
    buildId: 'build-002',
    analysisType: 'build-score',
    result: {
      score: 86
    }
  });

  const records = listAnalysisHistory();

  assert.equal(records.length, 2);
});

test('deve filtrar historico por buildId', () => {
  clearAnalysisHistoryForTests();
  createAnalysisHistoryRecord(validAnalysisHistoryInput);
  createAnalysisHistoryRecord({
    ...validAnalysisHistoryInput,
    buildId: 'build-002',
    analysisType: 'budget',
    result: {
      withinBudget: true
    }
  });

  const records = listAnalysisHistory({ buildId: ' build-001 ' });

  assert.equal(records.length, 1);
  assert.equal(records[0].buildId, 'build-001');
});

test('deve consultar historico por ID', () => {
  clearAnalysisHistoryForTests();
  const record = createAnalysisHistoryRecord(validAnalysisHistoryInput);

  const foundRecord = getAnalysisHistoryById(record.id);

  assert.equal(foundRecord.id, record.id);
});

test('deve remover historico de analise', () => {
  clearAnalysisHistoryForTests();
  const record = createAnalysisHistoryRecord(validAnalysisHistoryInput);

  const removedRecord = deleteAnalysisHistoryRecord(record.id);

  assert.equal(removedRecord.id, record.id);
  assert.equal(listAnalysisHistory().length, 0);
});

test('deve permitir registrar analise sem buildId', () => {
  clearAnalysisHistoryForTests();

  const record = createAnalysisHistoryRecord({
    analysisType: 'alerts',
    input: {
      cpuId: 'cpu-ryzen-5-5600'
    },
    result: {
      alerts: []
    }
  });

  assert.equal(Object.prototype.hasOwnProperty.call(record, 'buildId'), false);
});

test('deve retornar erro controlado quando campos obrigatorios estiverem ausentes', () => {
  clearAnalysisHistoryForTests();

  assert.throws(
    () => createAnalysisHistoryRecord({
      analysisType: 'compatibility',
      input: validAnalysisHistoryInput.input
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Dados obrigatorios ausentes para registrar historico de analise.');
      assert.equal(error.errors.includes('result deve ser informado como objeto ou array.'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para tipo de analise invalido', () => {
  clearAnalysisHistoryForTests();

  assert.throws(
    () => createAnalysisHistoryRecord({
      ...validAnalysisHistoryInput,
      analysisType: 'tipo-invalido'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Tipo de analise invalido.');
      assert.equal(error.errors[0].includes('compatibility'), true);
      return true;
    }
  );
});

test('deve retornar erro controlado para ID inexistente', () => {
  clearAnalysisHistoryForTests();

  assert.throws(
    () => getAnalysisHistoryById('analysis-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Historico de analise nao encontrado.');
      return true;
    }
  );
});