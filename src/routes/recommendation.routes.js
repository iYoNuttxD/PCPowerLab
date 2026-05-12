import { Router } from 'express';
import { recommendByBudget } from '../controllers/recommendationController.js';

export const recommendationRoutes = Router();

recommendationRoutes.post('/budget', recommendByBudget);
