import { Router } from 'express';
import {
  getSharedBuild,
  shareBuild
} from '../controllers/shareBuildController.js';

export const shareBuildRoutes = Router();

shareBuildRoutes.post('/build', shareBuild);
shareBuildRoutes.get('/build/:shareId', getSharedBuild);