import test from 'node:test';
import assert from 'node:assert/strict';

import { clearNotificationsForTests, listNotifications } from '../src/services/notificationsService.js';
import { clearSavedBuildsForTests, saveBuild } from '../src/services/savedBuildsService.js';
import {
  revalidateAllSavedBuilds,
  revalidateSavedBuild
} from '../src/services/savedBuildRevalidationService.js';
import {
  deleteNotification,
  markNotificationAsRead
} from '../src/services/notificationsService.js';

const compatibleSavedBuildInput = {
  name: 'Build compativel',
  components: {
    cpuId: 'cpu-ryzen-5-5600',
    gpuId: 'gpu-rtx-4060',
    motherboardId: 'mb-b550m-aorus-elite',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  }
};

const incompatibleSavedBuildInput = {
  name: 'Build com socket incompatível',
  components: {
    cpuId: 'cpu-ryzen-5-5600',
    gpuId: 'gpu-rtx-4060',
    motherboardId: 'mb-h610m-ddr4',
    ramId: 'ram-kingston-fury-16gb-ddr4',
    storageId: 'ssd-kingston-nv2-1tb',
    psuId: 'psu-corsair-650w',
    caseId: 'case-mid-tower-airflow'
  }
};

test('deve revalidar todas as builds salvas e criar notificacao para build incompativel', () => {
  resetState();
  saveBuild(compatibleSavedBuildInput);
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);

  const result = revalidateAllSavedBuilds();

  assert.equal(result.checkedBuilds, 2);
  assert.equal(result.notificationsCreated, 1);
  assert.equal(result.results.some((item) => item.status === 'compatible'), true);

  const incompatibleResult = result.results.find((item) => item.buildId === incompatibleBuild.id);
  assert.equal(incompatibleResult.status, 'incompatible');
  assert.equal(incompatibleResult.notifications.length, 1);
  assert.equal(incompatibleResult.notifications[0].buildId, incompatibleBuild.id);
  assert.equal(incompatibleResult.notifications[0].type, 'compatibility_changed');
  assert.equal(incompatibleResult.notifications[0].severity, 'high');
  assert.equal(incompatibleResult.notifications[0].read, false);
});

test('deve revalidar uma build salva especifica', () => {
  resetState();
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);

  const result = revalidateSavedBuild(incompatibleBuild.id);

  assert.equal(result.checkedBuilds, 1);
  assert.equal(result.notificationsCreated, 1);
  assert.equal(result.results[0].buildId, incompatibleBuild.id);
  assert.equal(result.results[0].status, 'incompatible');
});

test('deve evitar notificacoes duplicadas para o mesmo problema na mesma build', () => {
  resetState();
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);

  const firstResult = revalidateSavedBuild(incompatibleBuild.id);
  const secondResult = revalidateSavedBuild(incompatibleBuild.id);

  assert.equal(firstResult.notificationsCreated, 1);
  assert.equal(secondResult.notificationsCreated, 0);
  assert.equal(listNotifications().length, 1);
});

test('deve listar notificacoes e filtrar por buildId', () => {
  resetState();
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);
  saveBuild({
    ...incompatibleSavedBuildInput,
    name: 'Build com socket incompatível 2'
  });

  revalidateAllSavedBuilds();

  const allNotifications = listNotifications();
  const filteredNotifications = listNotifications({ buildId: incompatibleBuild.id });

  assert.equal(allNotifications.length, 2);
  assert.equal(filteredNotifications.length, 1);
  assert.equal(filteredNotifications[0].buildId, incompatibleBuild.id);
});

test('deve marcar notificacao como lida', () => {
  resetState();
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);
  revalidateSavedBuild(incompatibleBuild.id);

  const [notification] = listNotifications();
  const readNotification = markNotificationAsRead(notification.id);

  assert.equal(readNotification.read, true);
  assert.equal(Boolean(readNotification.readAt), true);
});

test('deve remover notificacao', () => {
  resetState();
  const incompatibleBuild = saveBuild(incompatibleSavedBuildInput);
  revalidateSavedBuild(incompatibleBuild.id);

  const [notification] = listNotifications();
  const deletedNotification = deleteNotification(notification.id);

  assert.equal(deletedNotification.id, notification.id);
  assert.equal(listNotifications().length, 0);
});

test('deve retornar erro controlado para notificacao inexistente', () => {
  resetState();

  assert.throws(
    () => markNotificationAsRead('notification-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Notificação não encontrada.');
      return true;
    }
  );
});

test('deve retornar erro controlado para build salva inexistente na revalidacao', () => {
  resetState();

  assert.throws(
    () => revalidateSavedBuild('build-inexistente'),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.message, 'Configuração salva não encontrada.');
      return true;
    }
  );
});

function resetState() {
  clearSavedBuildsForTests();
  clearNotificationsForTests();
}
