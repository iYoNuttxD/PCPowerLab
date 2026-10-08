import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPurchaseLinksByBuild,
  getPurchaseLinksByComponentId
} from '../src/services/purchaseLinksService.js';
import { createAdminComponent } from '../src/services/admin-component.service.js';

const validBuild = {
  components: {
    cpuId: 'cpu-ryzen-5-5600',
    motherboardId: 'mb-b550m-aorus-elite',
    gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  }
};

test('deve buscar links de compra por componentId', () => {
  const links = getPurchaseLinksByComponentId('gpu-rtx-4060');

  assert.equal(links.length > 0, true);
  assert.equal(links[0].componentId, 'gpu-rtx-4060');
  assert.equal(links[0].storeName, 'Kabum');
  assert.equal(links[0].url, 'https://www.kabum.com.br/busca/rtx-4060-8gb');
  assert.equal(links[0].currency, 'BRL');
  assert.equal(typeof links[0].price, 'number');
  assert.equal(typeof links[0].url, 'string');
  assert.equal(links.every((link) => link.url.startsWith('https://')), true);
  assert.equal(links.every((link) => link.isAffiliate === false), true);
  assert.equal(links.every((link) => link.availabilityStatus === 'unknown'), true);
  assert.equal(typeof links[0].isAffiliate, 'boolean');
  assert.equal(links[0].lastUpdated, null);
  assert.equal(links[0].kind, 'research');
  assert.equal(links[0].comparisonAvailable, false);
  assert.equal(['available', 'unavailable', 'unknown'].includes(links[0].availabilityStatus), true);
});

test('deve gerar buscas dinamicamente para componente cadastrado depois da inicialização', () => {
  createAdminComponent({
    id: 'case-test-no-purchase-link',
    name: 'Gabinete Test Sem Link',
    type: 'case',
    brand: 'Test',
    supportedFormFactors: ['ATX', 'mATX'],
    maxGpuLength: 320
  });

  const links = getPurchaseLinksByComponentId('case-test-no-purchase-link');

  assert.equal(links.length, 5);
  assert.ok(links.every(link => link.componentId === 'case-test-no-purchase-link' && link.availabilityStatus === 'unknown'));
  assert.equal(links[0].price, null);
});

test('deve buscar links de compra para todos os componentes de uma build', () => {
  const linksByBuild = getPurchaseLinksByBuild(validBuild);

  assert.equal(Array.isArray(linksByBuild.cpu), true);
  assert.equal(Array.isArray(linksByBuild.gpu), true);
  assert.equal(Array.isArray(linksByBuild.case), true);
  assert.equal(linksByBuild.cpu.length > 0, true);
  assert.equal(linksByBuild.gpu[0].componentId, 'gpu-rtx-4060');
  assert.equal(linksByBuild.case.length > 0, true);
});

test('deve aceitar build em formato plano', () => {
  const linksByBuild = getPurchaseLinksByBuild({
    cpuId: 'cpu-ryzen-5-5600',
    motherboardId: 'mb-b550m-aorus-elite',
    gpuId: 'gpu-rtx-4060',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  });

  assert.equal(linksByBuild.motherboard[0].componentId, 'mb-b550m-aorus-elite');
});

test('deve retornar erro controlado para componentId inexistente', () => {
  assert.throws(
    () => getPurchaseLinksByComponentId('component-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Componente nao encontrado para links de compra.');
      assert.equal(error.errors.some((message) => message.includes('component-inexistente')), true);
      return true;
    }
  );
});

test('deve retornar erro controlado quando componentId nao for informado', () => {
  assert.throws(
    () => getPurchaseLinksByComponentId(' '),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Informe o componente para consultar links de compra.');
      return true;
    }
  );
});

test('deve retornar erro controlado quando build estiver incompleta', () => {
  assert.throws(
    () => getPurchaseLinksByBuild({
      components: {
        cpuId: 'cpu-ryzen-5-5600'
      }
    }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, 'Selecao de componentes incompleta.');
      return true;
    }
  );
});
