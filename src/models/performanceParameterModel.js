import { componentCategories } from './component.model.js';

// Cooling is not a performance-score category: it must never imply an FPS bonus.
export const performanceParameterTypes = componentCategories.filter(type => !['cooler', 'fan'].includes(type));

export const requiredPerformanceFieldsByType = {
  cpu: ['performanceScore'],
  gpu: ['performanceScore'],
  ram: ['performanceScore'],
  storage: ['performanceScore'],
  psu: ['performanceScore'],
  motherboard: ['performanceScore'],
  case: ['performanceScore']
};

export const numericPerformanceFields = [
  'performanceScore',
  'cores',
  'threads',
  'baseClock',
  'boostClock',
  'tdp',
  'gamingScore',
  'productivityScore',
  'vram',
  'capacity',
  'speed',
  'readSpeed',
  'writeSpeed',
  'wattage',
  'maxGpuLength',
  'airflowScore'
];

export function isValidPerformanceParameterType(type) {
  return performanceParameterTypes.includes(type);
}
