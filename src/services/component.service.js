import { corePerformanceCategories, isUsableScoreParameter, hasVerifiedMeasurementEvidence, isSimulationParameterUsable } from '../utils/performanceAvailability.js';
import { referencePrice } from './marketPriceService.js';
import { findPerformanceParameterRecordByComponentId } from '../data/performance-parameter.repository.js';
import {
  findComponentRecordById,
  isSelectableComponentRecord,
  listComponentRecords,
  resolveComponentRecordById
} from '../data/component.repository.js';
import { componentCategories, isValidComponentCategory } from '../models/component.model.js';

export function listComponents(filters = {}) {
  const category = normalizeCategoryFilter(filters.type ?? filters.category);
  const records = listComponentRecords({ includeLegacy: filters.includeLegacy === true });

  if (!category) {
    return records.map(withCatalogPerformance);
  }

  validateComponentCategory(category);

  return records.filter((component) => component.category === category).map(withCatalogPerformance);
}

export function findComponentById(componentId) {
  const component = resolveComponentRecordById(componentId);
  return component ? withCatalogPerformance(component) : null;
}

export function findComponentsByIds(componentIds) {
  return componentIds.map((componentId) => findComponentById(componentId));
}

function normalizeCategoryFilter(category) {
  if (!category || typeof category !== 'string') {
    return null;
  }

  return category.trim().toLowerCase();
}

function validateComponentCategory(category) {
  if (isValidComponentCategory(category)) {
    return;
  }

  const error = new Error('Categoria de componente inválida.');
  error.statusCode = 400;
  error.errors = [`Categorias aceitas: ${componentCategories.join(', ')}.`];
  throw error;
}

export function withCatalogPerformance(component) {
  const parameter = ['cpu', 'gpu', 'ram', 'storage'].includes(component.category)
    ? findPerformanceParameterRecordByComponentId(component.id) : null;
  const score = corePerformanceCategories.includes(component.category) && !isUsableScoreParameter(component, parameter) ? null : parameter?.performanceScore;
  const performanceScore = typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
  return { ...withCatalogIdentity(component), performanceScore,
    performanceMethodology: performanceScore === null ? null
      : {
        basis: hasVerifiedMeasurementEvidence(parameter, component) ? 'measured' : 'simulated',
        kind: parameter?.scoreKind || 'internal-calibration',
        modelVersion: parameter?.modelVersion || 'catalog-internal-v1',
        shortLabel: hasVerifiedMeasurementEvidence(parameter, component) ? 'Índice baseado em benchmark' : 'Pontuação simulada',
        simulationSupported: isSimulationParameterUsable(component, parameter),
        measuredBenchmark: hasVerifiedMeasurementEvidence(parameter, component),
        description: 'Indice interno estimado de 0 a 100; compare apenas pecas da mesma categoria. Nao representa benchmark medido nem FPS.'
      } };
}

function withCatalogIdentity(component) {
  const legacy = component.lifecycle === 'legacy';
  const selectable = isSelectableComponentRecord(component);
  const replacementId = legacy && typeof component.replacementId === 'string' ? component.replacementId : null;
  const candidate = replacementId && replacementId !== component.id
    ? findComponentRecordById(replacementId) : null;
  const replacement = candidate?.category === component.category ? candidate : null;
  return {
    ...component,
    // Price and technical data always belong to this ID, not its suggested successor.
    pricing: referencePrice(component),
    catalogStatus: legacy ? 'legacy' : selectable ? 'active' : 'inactive',
    selectable,
    replacementId,
    replacement: replacement ? {
      id: replacement.id,
      name: replacement.name,
      category: replacement.category,
      requiresSelection: true
    } : null
  };
}
