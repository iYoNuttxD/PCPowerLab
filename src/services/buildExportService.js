import { requiredBuildSlots, selectBuildComponents } from './build.service.js';
import { generateBuildSummary } from './buildSummaryService.js';
import { getSavedBuildById } from './savedBuildsService.js';

const exportVersion = '1.0';
const exportSource = 'PCPowerLab';

export function exportBuildToJson(exportInput) {
  validateExportPayload(exportInput);

  const buildId = normalizeOptionalText(exportInput.buildId);
  const savedBuild = buildId ? getSavedBuildById(buildId) : null;
  const components = savedBuild
    ? mapSavedBuildComponentsToExport(savedBuild.components)
    : normalizeDirectBuildComponents(exportInput.build);
  const budget = exportInput.budget ?? savedBuild?.budget;
  const usageType = normalizeOptionalText(exportInput.usageType) ?? normalizeOptionalText(savedBuild?.usageType);

  return buildExportPayload({
    components,
    budget,
    usageType,
    includeSummary: exportInput.includeSummary === true,
    compatibilityStatus: savedBuild?.compatibilityStatus,
    totalEstimatedPrice: savedBuild?.totalEstimatedPrice
  });
}

export function exportSavedBuildToJson(savedBuildId, options = {}) {
  const savedBuild = getSavedBuildById(savedBuildId);
  const components = mapSavedBuildComponentsToExport(savedBuild.components);

  return buildExportPayload({
    components,
    budget: savedBuild.budget,
    usageType: savedBuild.usageType,
    includeSummary: normalizeBooleanOption(options.includeSummary),
    compatibilityStatus: savedBuild.compatibilityStatus,
    totalEstimatedPrice: savedBuild.totalEstimatedPrice
  });
}

function buildExportPayload({
  components,
  budget,
  usageType,
  includeSummary,
  compatibilityStatus,
  totalEstimatedPrice
}) {
  const exportPayload = {
    exportVersion,
    exportedAt: new Date().toISOString(),
    source: exportSource,
    build: removeEmptySections({
      components,
      budget,
      usageType
    })
  };

  if (includeSummary) {
    const summaryResult = buildSummaryForExport({
      components,
      budget,
      usageType,
      compatibilityStatus,
      totalEstimatedPrice
    });

    if (summaryResult.summary) {
      exportPayload.summary = summaryResult.summary;
    }

    if (summaryResult.warning) {
      exportPayload.warnings = [summaryResult.warning];
    }
  }

  return exportPayload;
}

function validateExportPayload(exportInput) {
  if (!exportInput || typeof exportInput !== 'object' || Array.isArray(exportInput)) {
    const error = new Error('Informe os dados para exportar a configuracao.');
    error.statusCode = 400;
    throw error;
  }

  if (normalizeOptionalText(exportInput.buildId) || isObject(exportInput.build)) {
    return;
  }

  const error = new Error('Informe uma build ou buildId para exportar a configuracao.');
  error.statusCode = 400;
  error.errors = ['build deve ser objeto ou buildId deve ser informado.'];
  throw error;
}

function normalizeDirectBuildComponents(buildInput) {
  if (!isObject(buildInput)) {
    const error = new Error('Informe a build para exportar a configuracao.');
    error.statusCode = 400;
    throw error;
  }

  selectBuildComponents(buildInput);

  return requiredBuildSlots.reduce((components, slot) => ({
    ...components,
    [`${slot}Id`]: normalizeOptionalText(buildInput[`${slot}Id`] ?? buildInput[slot] ?? buildInput.components?.[slot])
  }), {});
}

function mapSavedBuildComponentsToExport(componentsInput) {
  return requiredBuildSlots.reduce((components, slot) => ({
    ...components,
    [`${slot}Id`]: componentsInput[slot]
  }), {});
}

function buildSummaryForExport({
  components,
  budget,
  usageType,
  compatibilityStatus,
  totalEstimatedPrice
}) {
  try {
    const generatedSummary = generateBuildSummary({
      build: components,
      ...(budget && { budget }),
      ...(usageType && { usageType })
    });

    return {
      summary: {
        totalEstimatedPrice: generatedSummary.totalEstimatedPrice,
        compatibilityStatus: generatedSummary.compatibility.compatible ? 'compatible' : 'incompatible'
      }
    };
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) {
      throw error;
    }

    const fallbackSummary = removeEmptySections({
      totalEstimatedPrice,
      compatibilityStatus
    });

    return {
      ...(Object.keys(fallbackSummary).length > 0 && { summary: fallbackSummary }),
      warning: {
        message: 'Resumo indisponivel para os dados exportados.',
        errors: error.errors ?? [error.message]
      }
    };
  }
}

function normalizeBooleanOption(value) {
  return value === true || value === 'true';
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function removeEmptySections(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
  );
}
