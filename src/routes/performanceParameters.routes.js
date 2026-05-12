import { Router } from 'express';
import {
  deletePerformanceParametersByComponentId,
  getPerformanceParameters,
  getPerformanceParametersByComponentId,
  postPerformanceParameters,
  putPerformanceParameters
} from '../controllers/performanceParametersController.js';

export const performanceParametersRoutes = Router();

performanceParametersRoutes.get('/', getPerformanceParameters);
performanceParametersRoutes.get('/:componentId', getPerformanceParametersByComponentId);
performanceParametersRoutes.post('/', postPerformanceParameters);
performanceParametersRoutes.put('/:componentId', putPerformanceParameters);
performanceParametersRoutes.delete('/:componentId', deletePerformanceParametersByComponentId);
