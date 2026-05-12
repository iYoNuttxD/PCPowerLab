import { performanceParameters } from './performanceParameters.js';

export function listPerformanceParameterRecords() {
  return performanceParameters;
}

export function findPerformanceParameterRecordByComponentId(componentId) {
  return performanceParameters.find((parameter) => parameter.componentId === componentId) || null;
}

export function addPerformanceParameterRecord(parameter) {
  performanceParameters.push(parameter);

  return parameter;
}

export function updatePerformanceParameterRecord(componentId, parameterData) {
  const parameterIndex = performanceParameters.findIndex((parameter) => parameter.componentId === componentId);

  if (parameterIndex === -1) {
    return null;
  }

  performanceParameters[parameterIndex] = {
    ...performanceParameters[parameterIndex],
    ...parameterData,
    componentId
  };

  return performanceParameters[parameterIndex];
}

export function deletePerformanceParameterRecord(componentId) {
  const parameterIndex = performanceParameters.findIndex((parameter) => parameter.componentId === componentId);

  if (parameterIndex === -1) {
    return null;
  }

  const [deletedParameter] = performanceParameters.splice(parameterIndex, 1);

  return deletedParameter;
}
