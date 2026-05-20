import { Router } from 'express';
import {
  checkCompatibility,
  getCompatibilityAlerts
} from '../controllers/compatibility.controller.js';

export const compatibilityRoutes = Router();

compatibilityRoutes.post('/check', checkCompatibility);
compatibilityRoutes.post('/alerts', getCompatibilityAlerts);
