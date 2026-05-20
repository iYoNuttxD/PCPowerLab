import { Router } from 'express';
import { recommendByBudget, recommendByUsage } from '../controllers/recommendationController.js';

export const recommendationRoutes = Router();

recommendationRoutes.post('/budget', recommendByBudget);
recommendationRoutes.post('/by-usage', recommendByUsage);
