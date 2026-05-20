import { Router } from 'express';
import { createBuildSummary } from '../controllers/buildSummaryController.js';

export const buildSummaryRoutes = Router();

buildSummaryRoutes.post('/', createBuildSummary);
