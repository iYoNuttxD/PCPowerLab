import { Router } from 'express';
import { createUpgradeRoadmap } from '../controllers/upgradeRoadmapController.js';

export const upgradeRoadmapRoutes = Router();

upgradeRoadmapRoutes.post('/roadmap', createUpgradeRoadmap);
