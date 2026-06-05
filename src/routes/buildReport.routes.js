import { Router } from 'express';
import { createBuildReport } from '../controllers/buildReportController.js';

export const buildReportRoutes = Router();

buildReportRoutes.post('/', createBuildReport);
