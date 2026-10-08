import { checkBuildCompatibilityAlerts } from './compatibility-alert.service.js';
import { getSavedBuildById, listSavedBuilds } from './savedBuildsService.js';
import { createNotification } from './notificationsService.js';

const compatibilityChangedType = 'compatibility_changed';

export function revalidateAllSavedBuilds() {
  return buildRevalidationResponse(listSavedBuilds().map((savedBuild) => revalidateSavedBuildRecord(savedBuild)));
}

export function revalidateSavedBuild(savedBuildId) {
  const savedBuild = getSavedBuildById(savedBuildId);

  return buildRevalidationResponse([revalidateSavedBuildRecord(savedBuild)]);
}

function buildRevalidationResponse(results) {
  return {
    checkedBuilds: results.length,
    notificationsCreated: results.reduce((total, result) => total + result.notificationsCreated, 0),
    results: results.map(({ notificationsCreated: _notificationsCreated, ...result }) => result)
  };
}

function revalidateSavedBuildRecord(savedBuild) {
  try {
    const compatibilityResult = checkBuildCompatibilityAlerts(savedBuild.components);

    if (compatibilityResult.compatible) {
      return {
        buildId: savedBuild.id,
        status: 'compatible',
        notificationsCreated: 0,
        notifications: []
      };
    }

    return buildIncompatibleResult(savedBuild, compatibilityResult.alerts, compatibilityResult.status);
  } catch (error) {
    return buildIncompatibleResult(savedBuild, [buildCompatibilityErrorAlert(error)]);
  }
}

function buildIncompatibleResult(savedBuild, alerts, status = 'incompatible') {
  const notificationResults = alerts.map((alert) => createNotification({
    buildId: savedBuild.id,
    type: compatibilityChangedType,
    severity: alert.severity,
    issueCode: alert.code,
    message: buildNotificationMessage(alert)
  }));

  return {
    buildId: savedBuild.id,
    status,
    notificationsCreated: notificationResults.filter((result) => result.created).length,
    notifications: notificationResults.map((result) => result.notification)
  };
}

function buildCompatibilityErrorAlert(error) {
  return {
    code: 'SAVED_BUILD_REVALIDATION_ERROR',
    severity: 'high',
    message: error.message || 'A configuração salva não pôde ser revalidada.'
  };
}

function buildNotificationMessage(alert) {
  return `A configuração salva tem um ponto de compatibilidade para revisão: ${alert.message}`;
}
