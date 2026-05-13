import { Router } from 'express';
import { registerBudget } from '../controllers/budgetController.js';

export const budgetRoutes = Router();

budgetRoutes.post('/', registerBudget);