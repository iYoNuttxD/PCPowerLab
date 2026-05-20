import { Router } from 'express';
import { compareBuildConfigurations } from '../controllers/buildComparisonController.js';

export const buildComparisonRoutes = Router();

buildComparisonRoutes.post('/', compareBuildConfigurations);
