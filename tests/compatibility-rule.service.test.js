import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCompatibilityRule,
  deleteCompatibilityRule,
  updateCompatibilityRule,
  listCompatibilityRules
} from '../src/services/compatibility-rule.service.js';

test('deve listar as regras de compatibilidade mockadas', () => {
  const result = listCompatibilityRules();

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length >= 5, true);
  assert.equal(result.some((rule) => rule.id === 'rule-001'), true);
});

test('deve filtrar regras por sourceType', () => {
  const result = listCompatibilityRules({ sourceType: ' CPU ' });

  assert.equal(result.length > 0, true);
  assert.equal(result.every((rule) => rule.sourceType === 'cpu'), true);
});

test('deve cadastrar nova regra de compatibilidade', () => {
  const result = createCompatibilityRule({
    id: 'rule-test-chipset',
    name: 'Motherboard chipset should support CPU generation',
    sourceType: 'motherboard',
    targetType: 'cpu',
    field: 'chipset',
    targetField: 'generation',
    operator: 'includes',
    severity: 'medium',
    message: 'O chipset da placa-mãe deve suportar a geração do processador.'
  });

  assert.equal(result.id, 'rule-test-chipset');
  assert.equal(result.active, true);
  assert.equal(result.priority > 0, true);
  assert.equal(listCompatibilityRules().some((rule) => rule.id === 'rule-test-chipset'), true);
});

test('deve lançar erro controlado quando a regra estiver incompleta', () => {
  assert.throws(
    () => createCompatibilityRule({
      name: 'Invalid rule',
      sourceType: 'cpu'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Regra de compatibilidade inválida.');
      assert.equal(error.errors.some((item) => item.includes('targetType')), true);
      return true;
    }
  );
});

test('deve lançar erro controlado quando severidade for inválida', () => {
  assert.throws(
    () => createCompatibilityRule({
      name: 'Invalid severity rule',
      sourceType: 'cpu',
      targetType: 'motherboard',
      field: 'socket',
      operator: 'equals',
      severity: 'critical',
      message: 'Mensagem da regra.'
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((item) => item.includes('low, medium, high')), true);
      return true;
    }
  );
});

test('deve preservar campos camelCase em regras novas', () => {
  const result = createCompatibilityRule({
    id: 'rule-test-gpu-length',
    name: 'GPU length should fit case',
    sourceType: 'gpu',
    targetType: 'case',
    field: 'lengthMm',
    targetField: 'maxGpuLengthMm',
    operator: 'lessThanOrEqual',
    severity: 'medium',
    message: 'A placa de vídeo deve caber no gabinete.'
  });

  assert.equal(result.field, 'lengthMm');
  assert.equal(result.targetField, 'maxGpuLengthMm');
  assert.equal(result.operator, 'lessThanOrEqual');
});

test('deve atualizar regra de compatibilidade existente', () => {
  createCompatibilityRule({
    id: 'rule-test-update',
    name: 'Initial rule',
    sourceType: 'cpu',
    targetType: 'motherboard',
    field: 'socket',
    operator: 'equals',
    severity: 'medium',
    message: 'Mensagem inicial.'
  });

  const result = updateCompatibilityRule('rule-test-update', {
    name: 'Updated rule',
    severity: 'high',
    message: 'Mensagem atualizada.'
  });

  assert.equal(result.id, 'rule-test-update');
  assert.equal(result.name, 'Updated rule');
  assert.equal(result.severity, 'high');
  assert.equal(result.message, 'Mensagem atualizada.');
});

test('deve remover regra de compatibilidade existente', () => {
  createCompatibilityRule({
    id: 'rule-test-delete',
    name: 'Rule to delete',
    sourceType: 'gpu',
    targetType: 'case',
    field: 'lengthMm',
    targetField: 'maxGpuLengthMm',
    operator: 'lessThanOrEqual',
    severity: 'medium',
    message: 'A placa de video deve caber no gabinete.'
  });

  const result = deleteCompatibilityRule('rule-test-delete');

  assert.equal(result.id, 'rule-test-delete');
  assert.equal(listCompatibilityRules().some((rule) => rule.id === 'rule-test-delete'), false);
});
