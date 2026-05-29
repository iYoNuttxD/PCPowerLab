import { Router } from 'express';
import { createBuildScore } from '../controllers/buildScoreController.js';

export const buildScoreRoutes = Router();

buildScoreRoutes.post('/', createBuildScore);
