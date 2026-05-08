import { Router } from 'express';
import { getCompatibilityAlerts } from '../controllers/compatibility.controller.js';

export const compatibilityRoutes = Router();

compatibilityRoutes.post('/alerts', getCompatibilityAlerts);