import { Router } from 'express';
import {
  recommendByBudget,
  recommendByUsage,
  recommendBuildsByBudgetRangeController
} from '../controllers/recommendationController.js';

export const recommendationRoutes = Router();

recommendationRoutes.post('/budget', recommendByBudget);
recommendationRoutes.post('/by-usage', recommendByUsage);
recommendationRoutes.post('/builds-by-budget-range', recommendBuildsByBudgetRangeController);
