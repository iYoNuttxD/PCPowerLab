import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAdminComponent,
  deactivateAdminComponent,
  findAdminComponentById,
  listAdminComponents,
  updateAdminComponent
} from '../src/services/admin-component.service.js';
import { findComponentById, listComponents } from '../src/services/component.service.js';

test('deve cadastrar um novo componente administrativo', () => {
  const component = createAdminComponent({
    id: 'cpu-admin-test-001',
    name: 'Ryzen Admin Test',
    type: 'cpu',
    brand: 'AMD',
    socket: 'AM4',
    cores: 6,
    threads: 12,
    baseClock: 3.5,
    boostClock: 4.4,
    tdp: 65,
    estimatedPrice: 750
  });

  assert.equal(component.id, 'cpu-admin-test-001');
  assert.equal(component.category, 'cpu');
  assert.equal(component.price, 750);
  assert.equal(component.specs.boostClockGhz, 4.4);
});

test('deve editar componente existente', () => {
  const component = updateAdminComponent('cpu-admin-test-001', {
    name: 'Ryzen Admin Test Editado',
    estimatedPrice: 725
  });

  assert.equal(component.name, 'Ryzen Admin Test Editado');
  assert.equal(component.price, 725);
  assert.equal(component.specs.socket, 'AM4');
});

test('deve listar componentes administrativos incluindo inativos', () => {
  const component = createAdminComponent({
    id: 'gpu-admin-test-001',
    name: 'GPU Admin Test',
    type: 'gpu',
    vram: 8,
    tdp: 160,
    length: 240,
    recommendedPsu: 550
  });

  deactivateAdminComponent(component.id);

  const adminResult = listAdminComponents({ active: 'false' });
  const publicResult = listComponents({ type: 'gpu' });

  assert.equal(adminResult.some((item) => item.id === component.id), true);
  assert.equal(publicResult.some((item) => item.id === component.id), false);
});

test('deve desativar componente existente sem exclusao definitiva', () => {
  const component = deactivateAdminComponent('cpu-admin-test-001');

  assert.equal(component.active, false);
  assert.equal(findAdminComponentById('cpu-admin-test-001').active, false);
  assert.equal(findComponentById('cpu-admin-test-001'), null);
});

test('deve validar nome e tipo obrigatorios', () => {
  assert.throws(
    () => createAdminComponent({ type: 'cpu' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((message) => message.includes('name')), true);
      return true;
    }
  );
});

test('deve validar tipo conhecido', () => {
  assert.throws(
    () => createAdminComponent({ name: 'Monitor Test', type: 'monitor' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((message) => message.includes('Tipos aceitos')), true);
      return true;
    }
  );
});

test('deve validar campos tecnicos obrigatorios por tipo', () => {
  assert.throws(
    () => createAdminComponent({ name: 'Fonte sem potencia', type: 'psu', efficiency: '80 Plus Bronze' }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.errors.some((message) => message.includes('watts')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado ao editar ID inexistente', () => {
  assert.throws(
    () => updateAdminComponent('component-admin-inexistente', { name: 'Teste' }),
    (error) => {
      assert.equal(error.statusCode, 404);
      return true;
    }
  );
});
