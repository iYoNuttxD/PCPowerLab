import { Router } from 'express';
import { analyzeBottlenecks } from '../controllers/bottleneck.controller.js';

export const bottleneckRoutes = Router();

bottleneckRoutes.post('/analyze', analyzeBottlenecks);
