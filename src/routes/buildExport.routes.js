import { Router } from 'express';
import { createBuildJsonExport } from '../controllers/buildExportController.js';

export const buildExportRoutes = Router();

buildExportRoutes.post('/json', createBuildJsonExport);
