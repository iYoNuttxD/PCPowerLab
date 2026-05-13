import { Router } from 'express';
import { explainTechnicalResult } from '../controllers/explanationController.js';

export const explanationRoutes = Router();

explanationRoutes.post('/', explainTechnicalResult);