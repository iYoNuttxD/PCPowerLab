import { translateValue } from './translations.js';

export function getCoolingAssessment(value) {
  const assessment = value?.coolingAssessment || value?.compatibility?.coolingAssessment
    || value?.summary?.coolingAssessment || value?.source?.coolingAssessment
    || value?.technicalDetails?.compatibility?.coolingAssessment;
  return assessment && typeof assessment === 'object' && !Array.isArray(assessment) ? assessment : null;
}

export function hasUnverifiedCooling(value) {
  return getCoolingAssessment(value)?.status === 'unverified';
}

export function compatibilityDisplayLabel(status, value) {
  return status === 'compatible' && hasUnverifiedCooling(value)
    ? 'Peças principais compatíveis' : translateValue(status);
}
